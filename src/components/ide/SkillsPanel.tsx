import React, { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, Edit3, FileCode, Plus, Save, Trash2, X, Zap } from 'lucide-react';
import { ideApi } from './ideApi';

interface Skill {
  slug: string;
  name: string;
  description: string;
  tags: string[];
  enabled: boolean;
  glob: string | null;
  content: string;
  path: string;
}

export default function SkillsPanel({ workspace, readOnly }: { workspace: string; readOnly: boolean }) {
  const [skills, setSkills] = useState<Skill[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState({ name: '', description: '', tags: '', enabled: true, glob: '', content: '' });

  const load = useCallback(async () => {
    try {
      const r = await ideApi.skillsList(workspace);
      setSkills(r.skills || []);
    } catch (e: any) {
      setError(e.message);
    }
  }, [workspace]);

  useEffect(() => {
    void load();
  }, [load]);

  const startNew = () => {
    setEditing('');
    setDraft({ name: '', description: '', tags: '', enabled: true, glob: '', content: '' });
  };

  const startEdit = (s: Skill) => {
    setEditing(s.slug);
    setDraft({
      name: s.name,
      description: s.description,
      tags: (s.tags || []).join(', '),
      enabled: s.enabled,
      glob: s.glob || '',
      content: s.content,
    });
  };

  const save = async () => {
    if (!draft.name.trim() || !draft.content.trim() || busy) return;
    setBusy(true);
    setError('');
    try {
      await ideApi.skillsSave(workspace, {
        name: draft.name.trim(),
        content: draft.content,
        description: draft.description.trim(),
        tags: draft.tags.split(',').map((t) => t.trim()).filter(Boolean),
        enabled: draft.enabled,
        glob: draft.glob.trim() || undefined,
      });
      setEditing(null);
      await load();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const remove = async (name: string) => {
    try {
      await ideApi.skillsDelete(workspace, name);
      await load();
    } catch (e: any) {
      setError(e.message);
    }
  };

  return (
    <div className="flex flex-col gap-2.5 h-full">
      <div className="flex items-center gap-2">
        <button
          onClick={startNew}
          disabled={readOnly || (editing !== null)}
          className={`flex items-center justify-center gap-1.5 flex-1 py-2 rounded-lg text-[11px] transition-colors ${editing !== null ? 'bg-elevated text-ink' : 'bg-accent text-accent-fg hover:bg-accent'}`}
        >
          <Plus className="w-3.5 h-3.5" /> New skill
        </button>
        {editing !== null && (
          <button onClick={() => setEditing(null)} className="p-2 rounded-lg text-[10px] text-ink-muted hover:text-ink hover:bg-elevated transition-colors">
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {editing !== null && (
        <div className="rounded-lg border border-line-strong/30 bg-surface p-3 space-y-2">
          <input
            value={draft.name}
            onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
            placeholder="Skill name (e.g. payments or react-patterns)"
            disabled={editing !== ''}
            className="w-full rounded-md border border-line bg-surface px-2.5 py-1.5 text-[11px] font-mono text-ink outline-none focus:border-line-strong/60 placeholder:text-ink-muted disabled:opacity-50"
          />
          <input
            value={draft.description}
            onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
            placeholder="Description (optional)"
            className="w-full rounded-md border border-line bg-surface px-2.5 py-1.5 text-[11px] text-ink outline-none focus:border-line-strong/60 placeholder:text-ink-muted"
          />
          <div className="flex gap-2">
            <input
              value={draft.tags}
              onChange={(e) => setDraft((d) => ({ ...d, tags: e.target.value }))}
              placeholder="Tags, comma separated (optional)"
              className="flex-1 rounded-md border border-line bg-surface px-2.5 py-1.5 text-[11px] text-ink outline-none focus:border-line-strong/60 placeholder:text-ink-muted"
            />
            <input
              value={draft.glob}
              onChange={(e) => setDraft((d) => ({ ...d, glob: e.target.value }))}
              placeholder="Glob e.g. src/**/*.{ts,tsx}"
              className="flex-1 rounded-md border border-line bg-surface px-2.5 py-1.5 text-[11px] font-mono text-ink outline-none focus:border-line-strong/60 placeholder:text-ink-muted"
            />
          </div>
          <label className="flex items-center gap-2 text-[11px] text-ink-subtle">
            <input type="checkbox" checked={draft.enabled} onChange={(e) => setDraft((d) => ({ ...d, enabled: e.target.checked }))} className="accent-accent" />
            Enabled (injected into agent runs, composer and chat)
          </label>
          <textarea
            value={draft.content}
            onChange={(e) => setDraft((d) => ({ ...d, content: e.target.value }))}
            placeholder={'Playbook markdown…\ne.g.\n## Adding Stripe payments\n1. Install stripe:\n2. Init the client:\n3. Wire the webhook…'}
            className="w-full min-h-[140px] rounded-md border border-line bg-surface px-2.5 py-1.5 text-[11px] font-mono text-ink focus:border-line-strong/60 outline-none resize-y placeholder:text-ink-muted"
          />
          <button onClick={() => void save()} disabled={busy || !draft.name.trim() || !draft.content.trim() || readOnly} className="w-full py-1.5 rounded-md bg-emerald-600 hover:bg-emerald-500 text-[11px] text-ink transition-colors disabled:opacity-40">
            {busy ? 'Saving…' : 'Save skill'}
          </button>
        </div>
      )}

      {error && <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-[10px] text-rose-300 break-words">{error}</div>}

      <div className="flex-1 min-h-0 overflow-y-auto scrollbar-thin space-y-2 pr-0.5">
        {skills.length === 0 && (
          <div className="text-[10px] text-ink-muted leading-relaxed pt-1">
            No skills yet. Skills live in <code className="text-ink-subtle">.codestrom/skills/*.md</code> and are injected into every agent run,
            composer edit and chat call — reusable playbooks like <code className="text-ink-subtle">.cursor</code> skills.
          </div>
        )}
        {skills.map((s) => (
          <div key={s.slug} className="rounded-lg border border-line bg-surface overflow-hidden">
            <div className="flex items-center gap-2 px-3 py-2">
              <Zap className={`w-3.5 h-3.5 shrink-0 ${s.enabled ? 'text-ink-muted' : 'text-ink-muted'}`} />
              <div className="flex-1 min-w-0">
                <div className="text-[11px] text-ink font-medium truncate">
                  {s.name}
                  {s.glob ? <span className="text-ink-muted font-normal"> · {s.glob}</span> : null}
                </div>
                {s.description && <div className="text-[9px] text-ink-muted truncate">{s.description}</div>}
                {s.tags.length > 0 && <div className="text-[9px] text-ink-muted">{s.tags.map((t) => `#${t}`).join(' ')}</div>}
              </div>
              <span className={`shrink-0 text-[9px] px-1.5 py-0.5 rounded ${s.enabled ? 'bg-emerald-500/15 text-emerald-300' : 'bg-elevated/60 text-ink-subtle'}`}>
                {s.enabled ? 'on' : 'off'}
              </span>
              <button onClick={() => startEdit(s)} disabled={readOnly} className="p-1 rounded-md text-ink-muted hover:text-ink hover:bg-elevated transition-colors" title="Edit">
                <Edit3 className="w-3 h-3" />
              </button>
              <button onClick={() => void remove(s.slug)} disabled={readOnly} className="p-1 rounded-md text-ink-muted hover:text-rose-400 hover:bg-rose-500/10 transition-colors" title="Delete">
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
            <div className="border-t border-line/60 px-3 py-2 text-[10px] text-ink-subtle leading-relaxed whitespace-pre-wrap line-clamp-4">{s.content}</div>
          </div>
        ))}
        {skills.length > 0 && (
          <div className="text-[9px] text-ink-muted flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-emerald-500/70" /> {skills.filter((s) => s.enabled).length} enabled skills will be injected as context.
          </div>
        )}
      </div>
    </div>
  );
}
