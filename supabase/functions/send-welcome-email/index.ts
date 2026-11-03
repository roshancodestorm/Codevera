import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * ============================================================================
 * ARCHITECTURE ENFORCEMENT GUARD
 * ============================================================================
 * To prevent dual-architecture duplicate sends (Express backend + Edge Function
 * writing to separate databases), Codevora AI designates the Express backend
 * (/api/auth/welcome-email) as the primary authoritative dispatcher.
 *
 * This function will only execute if ENABLE_SUPABASE_EDGE_DISPATCH=true is set
 * in Supabase Edge Function Secrets. Otherwise, it safely rejects invocation.
 */

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // Enforce single-architecture rule
  const edgeDispatchEnabled = Deno.env.get("ENABLE_SUPABASE_EDGE_DISPATCH") === "true";
  if (!edgeDispatchEnabled) {
    return new Response(
      JSON.stringify({
        error: "Supabase Edge Function dispatch is disabled. Codevora AI uses the centralized Express backend (/api/auth/welcome-email) to guarantee single-architecture delivery and prevent duplicate emails.",
        architecture: "express_backend_active",
      }),
      { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Missing or malformed Authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace(/^Bearer\s+/, "").trim();
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || supabaseAnonKey;

    if (!supabaseUrl || !supabaseAnonKey) {
      return new Response(
        JSON.stringify({ error: "Supabase environment variables not configured on edge function" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 1. Verify token server-side with Supabase Auth
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false },
    });
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid or expired session token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = user.id;
    const userEmail = user.email;
    const provider = user.app_metadata?.provider || "email";
    const fullName = user.user_metadata?.full_name || user.user_metadata?.name || "Developer";

    if (!userEmail) {
      return new Response(
        JSON.stringify({ error: "User record lacks email address" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Eligibility checks
    if (provider === "email" && !user.email_confirmed_at) {
      return new Response(
        JSON.stringify({ error: "Email address not yet confirmed" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    });

    // Check Google OAuth new registration vs repeat login (< 10 min window)
    if (provider === "google") {
      const accountCreatedAt = new Date(user.created_at).getTime();
      const accountAgeMs = Date.now() - accountCreatedAt;

      if (accountAgeMs > 10 * 60 * 1000) {
        await supabaseAdmin.from("welcome_email_dispatches").upsert({
          user_id: userId,
          email: userEmail,
          provider,
          status: "skipped",
          error_message: "Existing account login (outside initial registration window)",
          updated_at: new Date().toISOString(),
        });
        return new Response(
          JSON.stringify({ success: true, message: "Repeat Google login skipped", skipped: true }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // 3. Database-enforced atomic slot acquisition
    const nowIso = new Date().toISOString();
    const { error: insertError } = await supabaseAdmin
      .from("welcome_email_dispatches")
      .insert({
        user_id: userId,
        email: userEmail,
        provider,
        status: "pending",
        created_at: nowIso,
        updated_at: nowIso,
      });

    if (insertError) {
      const { data: existing } = await supabaseAdmin
        .from("welcome_email_dispatches")
        .select("status, updated_at")
        .eq("user_id", userId)
        .maybeSingle();

      if (existing) {
        if (existing.status === "sent") {
          return new Response(
            JSON.stringify({ success: true, message: "Welcome email already delivered", alreadySent: true }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        if (existing.status === "skipped") {
          return new Response(
            JSON.stringify({ success: true, message: "Welcome email skipped for this account", skipped: true }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        if (existing.status === "pending") {
          const diffMinutes = (Date.now() - new Date(existing.updated_at).getTime()) / (1000 * 60);
          if (diffMinutes < 5) {
            return new Response(
              JSON.stringify({ success: true, message: "Welcome email dispatch already in progress", inProgress: true }),
              { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
        }
      }

      await supabaseAdmin
        .from("welcome_email_dispatches")
        .update({ status: "pending", updated_at: nowIso })
        .eq("user_id", userId);
    }

    // 4. App URL resolution
    const appUrl = Deno.env.get("APP_PUBLIC_URL") || Deno.env.get("FRONTEND_URL");
    if (!appUrl) {
      await supabaseAdmin.from("welcome_email_dispatches").update({ status: "failed", error_message: "Missing APP_PUBLIC_URL" }).eq("user_id", userId);
      return new Response(
        JSON.stringify({ error: "APP_PUBLIC_URL is required in production environment before sending emails", requiresSetup: true }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 5. Provider credentials
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      await supabaseAdmin.from("welcome_email_dispatches").update({ status: "failed", error_message: "RESEND_API_KEY not configured" }).eq("user_id", userId);
      return new Response(
        JSON.stringify({ error: "RESEND_API_KEY secret not configured in Supabase Edge Function secrets", requiresSetup: true }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 6. Build content
    const publicLogoUrl = Deno.env.get("PUBLIC_LOGO_URL") || (appUrl.startsWith("https://") ? `${appUrl}/favicon.svg` : null);
    const logoMark = (publicLogoUrl && publicLogoUrl.startsWith("https://"))
      ? `<img src="${publicLogoUrl}" alt="Codevora AI" width="40" height="40" style="display:block;border-radius:10px;width:40px;height:40px;" />`
      : `<div style="display:inline-block;width:40px;height:40px;border-radius:10px;background:linear-gradient(135deg, #863bff 0%, #06b6d4 100%);line-height:40px;text-align:center;color:#ffffff;font-weight:800;font-size:20px;">C</div>`;

    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8"><title>Welcome to Codevora AI</title></head>
      <body style="margin:0;padding:40px 10px;background-color:#05070d;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#e2e8f0;">
        <center>
          <table width="100%" style="max-width:580px;background:#0d121f;border:1px solid #1e293b;border-radius:20px;padding:36px;text-align:left;">
            <tr><td align="center">${logoMark}</td></tr>
            <tr>
              <td>
                <h1 style="color:#ffffff;font-size:22px;margin:20px 0 10px;">Welcome aboard, ${fullName}!</h1>
                <p style="color:#94a3b8;font-size:14px;line-height:1.6;">Your Codevora AI workspace is active and ready to build. You can now access autonomous coding pipelines, model routing, and sandboxes.</p>
                <div style="text-align:center;margin:30px 0;">
                  <a href="${appUrl}" target="_blank" style="background:linear-gradient(135deg,#7c3aed,#2563eb);color:#ffffff;text-decoration:none;padding:12px 28px;border-radius:10px;font-weight:600;font-size:14px;display:inline-block;">Launch Workspace &rarr;</a>
                </div>
                <p style="color:#475569;font-size:11px;border-top:1px solid #1e293b;padding-top:16px;">Signed in via ${provider}. &copy; Codevora AI</p>
              </td>
            </tr>
          </table>
        </center>
      </body>
      </html>
    `;

    const fromAddress = Deno.env.get("EMAIL_FROM") || "Codevora AI <notifications@codevora.ai>";
    const resendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${resendApiKey}`,
        "Idempotency-Key": `codevora-welcome-${userId}`, // Resend provider-level idempotency
      },
      body: JSON.stringify({
        from: fromAddress,
        to: [userEmail],
        subject: `Welcome to Codevora AI, ${fullName}! 🚀`,
        html: emailHtml,
      }),
    });

    const resendData = await resendRes.json();
    if (!resendRes.ok) {
      const err = resendData?.message || "Resend email dispatch failed";
      await supabaseAdmin.from("welcome_email_dispatches").update({
        status: "failed",
        error_message: err,
        updated_at: new Date().toISOString(),
      }).eq("user_id", userId);
      return new Response(JSON.stringify({ error: err }), { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const messageId = resendData?.id || "resend-" + Date.now();
    await supabaseAdmin.from("welcome_email_dispatches").update({
      status: "sent",
      provider_message_id: messageId,
      sent_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).eq("user_id", userId);

    return new Response(
      JSON.stringify({ success: true, message: "Welcome email dispatched", messageId }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Internal error";
    return new Response(
      JSON.stringify({ error: msg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
