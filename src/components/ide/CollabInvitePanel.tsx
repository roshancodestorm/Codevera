import React, { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, Copy, Link2, Loader2, Users } from 'lucide-react';
import { ideApi } from './ideApi';

interface Props {
  workspace: string;
  peers: { name: string; color: string }[];
  onToast: (msg: string) => void;
}

export default function CollabInvitePanel({ workspace, peers, onToast }: Props) {
  const [inviteUrl, setInviteUrl] = useState('');
  const [readOnly, setReadOnly] = useState(false);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [peerCount, setPeerCount] = useState(0);

  const refreshPeers = useCallback(async () => {
    if (!workspace) return;
    try {
      const r = await ideApi.collabPeers(workspace);
      setPeerCount(r.count);
    } catch {}
  }, [workspace]);

  useEffect(() => {
    refreshPeers();
    const t = setInterval(refreshPeers, 5000);
    return () => clearInterval(t);
  }, [refreshPeers]);

  const generateLink = async () => {
    if (!workspace) return;
    setBusy(true);
    try {
      const r = await ideApi.collabInvite(workspace, readOnly);
      const full = `${window.location.origin}${r.url}`;
      setInviteUrl(full);
    } catch (err: any) {
      onToast(`Invite failed: ${err.message}`);
    } finally {
      setBusy(false);
    }
  };

  const copy = async () => {
    if (!inviteUrl) return;
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      onToast('Invite link copied!');
    } catch {}
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Live peers */}
      <div className="rounded-lg border border-line bg-surface/60 px-3 py-2.5">
        <div className="flex items-center gap-2 mb-2">
          <Users className="w-3.5 h-3.5 text-ink-muted" />
          <span className="text-[11px] font-semibold text-ink">Live collaborators</span>
          <span className="ml-auto text-[10px] text-ink-muted">{peerCount} connected</span>
        </div>
        {peers.length === 0 ? (
          <p className="text-[11px] text-ink-muted">No one else is here yet. Share the invite link below.</p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {peers.map((p) => (
              <div key={p.name} className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium" style={{ background: p.color + '22', border: `1px solid ${p.color}55`, color: p.color }}>
                <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: p.color }} />
                {p.name}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Generate invite */}
      <div className="flex flex-col gap-2.5">
        <div className="text-[11px] font-semibold text-ink">Generate invite link</div>
        <label className="flex items-center gap-2 text-[11px] text-ink-subtle cursor-pointer">
          <input type="checkbox" checked={readOnly} onChange={(e) => setReadOnly(e.target.checked)} className="accent-accent" />
          Read-only guest (can view but not edit)
        </label>
        <button
          onClick={generateLink}
          disabled={busy || !workspace}
          className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent text-accent-fg text-[11px] font-medium hover:bg-accent disabled:opacity-40 transition-colors"
        >
          {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : <Link2 className="w-3 h-3" />}
          {busy ? 'Generating…' : 'Create invite link'}
        </button>

        {inviteUrl && (
          <div className="flex items-center gap-1.5 rounded-lg border border-line-strong/30 bg-accent/5 px-2.5 py-2">
            <span className="flex-1 text-[10px] font-mono text-ink truncate">{inviteUrl}</span>
            <button onClick={copy} className="shrink-0 p-1 rounded text-ink-subtle hover:text-ink transition-colors">
              {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
        )}
        <p className="text-[10px] text-ink-muted">Links expire after 24 hours. The recipient opens the link and it auto-connects them to this workspace.</p>
      </div>
    </div>
  );
}
