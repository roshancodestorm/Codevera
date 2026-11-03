// ── Theme pack: 30 polished deck themes ─────────────────────────────
// Pure data + pure functions, no DOM access. Loaded after restyle-engine.js
// (uses relativeLuminance) and before app.js.
//
// Each theme: role colors (ink/paper/surface/accent/pop/muted), dark flag,
// and system-safe font stacks. applyThemeToPages() remaps every element by
// luminance/role so text stays readable and accents stay accent-like —
// the same engine powers one-click "Remix whole deck".

const THEMES = [
  // Business
  { id: "midnight-board", label: "Midnight Board", group: "Business", dark: true, ink: "#0b1220", paper: "#ffffff", surface: "#eef2f7", accent: "#2563eb", pop: "#22d3ee", muted: "#64748b", headingFont: "Montserrat", bodyFont: "Inter" },
  { id: "consulting-blue", label: "Consulting Blue", group: "Business", dark: false, ink: "#0f2a43", paper: "#ffffff", surface: "#eaf1f8", accent: "#1d4ed8", pop: "#38bdf8", muted: "#5b7085", headingFont: "Georgia", bodyFont: "Verdana" },
  { id: "boardroom-slate", label: "Boardroom Slate", group: "Business", dark: false, ink: "#1e293b", paper: "#f8fafc", surface: "#e2e8f0", accent: "#475569", pop: "#0ea5e9", muted: "#7c8ba1", headingFont: "Helvetica", bodyFont: "Helvetica" },
  { id: "quarterly-gold", label: "Quarterly Gold", group: "Business", dark: true, ink: "#101418", paper: "#f5f1e6", surface: "#e7dfc9", accent: "#c9a227", pop: "#e2b93b", muted: "#8d8672", headingFont: "Palatino", bodyFont: "Georgia" },
  { id: "startup-punch", label: "Startup Punch", group: "Business", dark: false, ink: "#18181b", paper: "#ffffff", surface: "#fafafa", accent: "#7c3aed", pop: "#f59e0b", muted: "#71717a", headingFont: "Trebuchet MS", bodyFont: "Segoe UI" },
  { id: "investor-forest", label: "Investor Forest", group: "Business", dark: false, ink: "#14532d", paper: "#f7fbf5", surface: "#e4f2e0", accent: "#16a34a", pop: "#84cc16", muted: "#55795f", headingFont: "Georgia", bodyFont: "Inter" },
  { id: "coral-pitch", label: "Coral Pitch", group: "Business", dark: false, ink: "#431407", paper: "#fff7f2", surface: "#ffe8dc", accent: "#ea580c", pop: "#fb923c", muted: "#9a6b52", headingFont: "Verdana", bodyFont: "Segoe UI" },
  { id: "steel-report", label: "Steel Report", group: "Business", dark: false, ink: "#27272a", paper: "#ffffff", surface: "#f4f4f5", accent: "#3f3f46", pop: "#ef4444", muted: "#8b8b93", headingFont: "Arial", bodyFont: "Arial" },

  // Tech / Dark
  { id: "neon-grid", label: "Neon Grid", group: "Tech & Dark", dark: true, ink: "#07090f", paper: "#0e1420", surface: "#141c2c", accent: "#22d3ee", pop: "#a78bfa", muted: "#7d8aa3", headingFont: "Consolas", bodyFont: "Inter" },
  { id: "cyber-lime", label: "Cyber Lime", group: "Tech & Dark", dark: true, ink: "#050807", paper: "#0c120e", surface: "#122019", accent: "#4ade80", pop: "#bef264", muted: "#6f8577", headingFont: "Consolas", bodyFont: "Verdana" },
  { id: "deep-space", label: "Deep Space", group: "Tech & Dark", dark: true, ink: "#060814", paper: "#0d1128", surface: "#151b38", accent: "#818cf8", pop: "#f472b6", muted: "#8890ad", headingFont: "Trebuchet MS", bodyFont: "Inter" },
  { id: "terminal-amber", label: "Terminal Amber", group: "Tech & Dark", dark: true, ink: "#0a0806", paper: "#12100b", surface: "#1c1812", accent: "#fbbf24", pop: "#f97316", muted: "#94856c", headingFont: "Courier New", bodyFont: "Courier New" },
  { id: "quantum-teal", label: "Quantum Teal", group: "Tech & Dark", dark: true, ink: "#041210", paper: "#0a1f1c", surface: "#10302b", accent: "#2dd4bf", pop: "#5eead4", muted: "#6d918b", headingFont: "Segoe UI", bodyFont: "Inter" },
  { id: "graphite-pro", label: "Graphite Pro", group: "Tech & Dark", dark: true, ink: "#111114", paper: "#1b1c20", surface: "#24262c", accent: "#e4e4e7", pop: "#f43f5e", muted: "#8f929c", headingFont: "Helvetica", bodyFont: "Helvetica" },

  // Editorial
  { id: "magazine-serif", label: "Magazine Serif", group: "Editorial", dark: false, ink: "#1c1917", paper: "#fdfcf9", surface: "#f2efe8", accent: "#b91c1c", pop: "#d97706", muted: "#78716c", headingFont: "Playfair Display", bodyFont: "Georgia" },
  { id: "newsprint", label: "Newsprint", group: "Editorial", dark: false, ink: "#171717", paper: "#fafaf7", surface: "#eeeeea", accent: "#171717", pop: "#dc2626", muted: "#8a8a84", headingFont: "Times New Roman", bodyFont: "Georgia" },
  { id: "kinfolk-cream", label: "Kinfolk Cream", group: "Editorial", dark: false, ink: "#44403c", paper: "#fbf8f3", surface: "#f0ebe1", accent: "#a16207", pop: "#ca8a04", muted: "#96908a", headingFont: "Optima", bodyFont: "Georgia" },
  { id: "split-story", label: "Split Story", group: "Editorial", dark: false, ink: "#172554", paper: "#eff6ff", surface: "#dbeafe", accent: "#1d4ed8", pop: "#f59e0b", muted: "#64748b", headingFont: "Georgia", bodyFont: "Segoe UI" },
  { id: "journal-noir", label: "Journal Noir", group: "Editorial", dark: true, ink: "#0c0a09", paper: "#1c1917", surface: "#282320", accent: "#fbbf24", pop: "#fde68a", muted: "#a8a29e", headingFont: "Playfair Display", bodyFont: "Georgia" },

  // Creative & Bold
  { id: "pop-art", label: "Pop Art", group: "Creative & Bold", dark: false, ink: "#0a0a0a", paper: "#fff1f2", surface: "#ffe4e6", accent: "#e11d48", pop: "#facc15", muted: "#9f6b74", headingFont: "Impact", bodyFont: "Verdana" },
  { id: "sunset-fade", label: "Sunset Fade", group: "Creative & Bold", dark: false, ink: "#3b0764", paper: "#faf5ff", surface: "#f3e8ff", accent: "#c026d3", pop: "#fb923c", muted: "#8b6b9e", headingFont: "Trebuchet MS", bodyFont: "Segoe UI" },
  { id: "graffiti-street", label: "Graffiti Street", group: "Creative & Bold", dark: true, ink: "#09090b", paper: "#18181b", surface: "#232227", accent: "#f43f5e", pop: "#22d3ee", muted: "#8d8d96", headingFont: "Impact", bodyFont: "Arial Black" },
  { id: "duotone-mint", label: "Duotone Mint", group: "Creative & Bold", dark: false, ink: "#064e3b", paper: "#ecfdf5", surface: "#d1fae5", accent: "#059669", pop: "#10b981", muted: "#5f8a79", headingFont: "Verdana", bodyFont: "Inter" },
  { id: "electric-cobalt", label: "Electric Cobalt", group: "Creative & Bold", dark: false, ink: "#1e1b4b", paper: "#eef2ff", surface: "#e0e7ff", accent: "#4338ca", pop: "#06b6d4", muted: "#6d76a8", headingFont: "Arial Black", bodyFont: "Segoe UI" },
  { id: "studio-mono", label: "Studio Mono", group: "Creative & Bold", dark: false, ink: "#0a0a0a", paper: "#ffffff", surface: "#f5f5f5", accent: "#0a0a0a", pop: "#ef4444", muted: "#8f8f8f", headingFont: "Futura", bodyFont: "Century Gothic" },

  // Nature & Warm
  { id: "harvest-wheat", label: "Harvest Wheat", group: "Nature & Warm", dark: false, ink: "#3f2d12", paper: "#fdf9ee", surface: "#f3ead2", accent: "#b45309", pop: "#65a30d", muted: "#8f7f63", headingFont: "Georgia", bodyFont: "Verdana" },
  { id: "ocean-breeze", label: "Ocean Breeze", group: "Nature & Warm", dark: false, ink: "#0c4a6e", paper: "#f0f9ff", surface: "#e0f2fe", accent: "#0284c7", pop: "#06b6d4", muted: "#5f7f92", headingFont: "Trebuchet MS", bodyFont: "Inter" },
  { id: "desert-clay", label: "Desert Clay", group: "Nature & Warm", dark: false, ink: "#431407", paper: "#fef6f0", surface: "#fbe8d8", accent: "#c2410c", pop: "#d97706", muted: "#97705c", headingFont: "Palatino", bodyFont: "Segoe UI" },
  { id: "alpine-mist", label: "Alpine Mist", group: "Nature & Warm", dark: false, ink: "#334155", paper: "#f8fafc", surface: "#e8eef4", accent: "#0f766e", pop: "#34d399", muted: "#7a8ba0", headingFont: "Optima", bodyFont: "Inter" },
  { id: "ember-night", label: "Ember Night", group: "Nature & Warm", dark: true, ink: "#140a06", paper: "#20100a", surface: "#2e1a10", accent: "#fb923c", pop: "#f87171", muted: "#a08272", headingFont: "Georgia", bodyFont: "Verdana" },
];

const THEME_MAP = new Map(THEMES.map((theme) => [theme.id, theme]));

function themeById(id) {
  return THEME_MAP.get(String(id || "")) || null;
}

function themeGroups() {
  const groups = [];
  THEMES.forEach((theme) => {
    if (!groups.includes(theme.group)) groups.push(theme.group);
  });
  return groups;
}

function themeToRestylePreset(theme) {
  return {
    id: theme.id,
    label: theme.label,
    ink: theme.ink,
    paper: theme.paper,
    surface: theme.surface,
    accent: theme.accent,
    pop: theme.pop,
    muted: theme.muted,
    dark: theme.dark,
    darkBg: theme.dark ? theme.paper : theme.ink,
    headingFont: theme.headingFont,
    bodyFont: theme.bodyFont,
  };
}

// Role/luminance-based full-deck retheme. Text stays readable: near-white
// text survives on dark backgrounds, near-black text remaps to the theme's
// ink, mid-tones become accents. Fonts follow weight (headings vs body).
function applyThemeToPages(pages, theme) {
  if (!theme) return pages;
  const preset = themeToRestylePreset(theme);
  const cloned = JSON.parse(JSON.stringify(pages));
  cloned.forEach((page) => {
    if (!page || !Array.isArray(page.elements)) return;
    const bgLum = relativeLuminance(page.background);
    page.background = theme.dark
      ? (bgLum < 0.4 ? preset.darkBg : preset.surface)
      : (bgLum > 0.6 ? preset.paper : preset.surface);
    page.elements.forEach((el) => {
      if (!el) return;
      if (el.type === "image" || el.type === "video") return;
      const lum = relativeLuminance(el.color || el.fill);
      if (el.type === "text") {
        const wasLight = lum > 0.75;
        if (wasLight && theme.dark) {
          el.color = "#f1f5f9";
        } else if (wasLight) {
          el.color = preset.paper;
        } else if (!wasLight && lum < 0.3) {
          el.color = theme.dark ? "#e2e8f0" : preset.ink;
        } else {
          el.color = preset.accent;
        }
        const isHeading = Number(el.fontWeight || 400) >= 700;
        el.fontFamily = isHeading ? theme.headingFont : theme.bodyFont;
      } else if (el.type === "icon") {
        el.color = lum > 0.75 ? preset.pop : preset.accent;
      } else if (el.fill) {
        if (lum > 0.85) el.fill = preset.surface;
        else if (lum < 0.35) el.fill = preset.accent;
        else el.fill = preset.pop;
      }
    });
  });
  return cloned;
}
