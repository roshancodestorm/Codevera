import { useState } from 'react';
import { Activity, CheckCircle2, ChevronDown, ChevronRight, CircleDashed, Loader2, PlayCircle, RotateCcw, ShieldCheck, XCircle } from 'lucide-react';
import { ideApi } from './ideApi';

interface Props {
  workspace: string;
  task: any; // live task record (has .delivery)
  running: boolean;
  onToast: (msg: string) => void;
}

const SEV_STYLE: Record<string, { label: string; cls: string; dot: string }> = {
  critical: { label: 'critical', cls: 'border-rose-500/40 bg-rose-500/10 text-rose-300', dot: 'bg-rose-400' },
  high: { label: 'high', cls: 'border-orange-500/40 bg-orange-500/10 text-orange-300', dot: 'bg-orange-400' },
  medium: { label: 'medium', cls: 'border-amber-500/40 bg-amber-500/10 text-amber-300', dot: 'bg-amber-400' },
  low: { label: 'low', cls: 'border-line-strong/40 bg-accent/10 text-ink-muted', dot: 'bg-accent' },
  style: { label: 'style', cls: 'border-line/60 bg-elevated/60 text-ink-subtle', dot: 'bg-line-strong' },
};

export default function DeliveryPanel({ workspace, task, running, onToast }: Props) {
  const [open, setOpen] = useState(true);
  const [expandedPhase, setExpandedPhase] = useState<string | null>(null);
  const [rollbacking, setRollbacking] = useState(false);
  const [continuing, setContinuing] = useState(false);
  const [configOpen, setConfigOpen] = useState(false);
  const [crCli, setCrCli] = useState('');
  const [crKey, setCrKey] = useState('');
  const delivery = task?.delivery;
  if (!delivery) return null;

  const phases: any[] = delivery.phases || [];
  const iterations = delivery.ralph?.iterations || [];
  const perStage: Record<string, any> = delivery.ralph?.perStage || {};
  const findings: any[] = delivery.review?.findings || [];
  const verification = delivery.verification;
  const report = delivery.report;
  const blockers: string[] = delivery.blockers || [];
  const waitingState = ['awaiting_approval'].includes(task.state);
  const lastIteration = iterations[iterations.length - 1];

  const doRollback = async () => {
    if (!workspace) return;
    setRollbacking(true);
    try {
      const r = await ideApi.deliveryRollback(workspace);
      onToast(r.error ? `Rollback: ${r.error}` : `Rolled back to last phase snapshot (${r.restored ?? 0} restored, ${r.removed ?? 0} removed)`);
    } catch (err: any) {
      onToast(`Rollback failed: ${err.message}`);
    } finally {
      setRollbacking(false);
    }
  };

  const doContinue = async () => {
    if (!task.id) return;
    setContinuing(true);
    try {
      await ideApi.deliveryContinue(task.id, 'accept');
      onToast('Review checkpoint continued — delivery resumes');
    } catch (err: any) {
      onToast(`Continue failed: ${err.message}`);
    } finally {
      setContinuing(false);
    }
  };

  const enableCodeRabbit = async () => {
    if (!workspace) return;
    try {
      const r = await ideApi.saveDeliveryConfig(workspace, { coderabbit: { enabled: true, cli: crCli.trim(), apiKey: crKey.trim() } }, { decision: 'approve' });
      if (r.needsApproval) {
        onToast(r.message || 'CodeRabbit requires explicit approval');
        return;
      }
      onToast('CodeRabbit review enabled (cloud service approved)');
      setConfigOpen(false);
    } catch (err: any) {
      onToast(`Config failed: ${err.message}`);
    }
  };

  const sev = (s: string) => SEV_STYLE[s] || SEV_STYLE.medium;

  return (
    <div className="shrink-0 border-b border-line/70 bg-emerald-500/[0.03]">
      <button onClick={() => setOpen((o) => !o)} className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-elevated/30 transition-colors">
        {open ? <ChevronDown className="w-3.5 h-3.5 text-emerald-400" /> : <ChevronRight className="w-3.5 h-3.5 text-emerald-400" />}
        <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
        <span className="text-[10px] font-semibold uppercase tracking-wider text-emerald-300">Delivery pipeline</span>
        <span className="ml-auto flex items-center gap-1 text-[9px] text-ink-muted">
          {delivery.stack ? <span className="rounded border border-emerald-500/20 bg-emerald-500/10 px-1 py-px text-emerald-300">{delivery.stack}</span> : null}
          <span className="rounded border border-line px-1 py-px">{delivery.providers?.filter((p: any) => p.enabled).length || 0}/{delivery.providers?.length || 0} providers</span>
        </span>
      </button>

      {open && (
        <div className="px-3 pb-3 space-y-2">
          {/* Provider chips */}
          <div className="flex flex-wrap gap-1">
            {(delivery.providers || []).map((p: any) => (
              <span key={p.id} title={`${p.label} — hooks: ${p.hooks.join(', ')}`} className={`rounded border px-1.5 py-0.5 text-[9px] ${p.enabled ? (p.configured ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300' : 'border-amber-500/30 bg-amber-500/10 text-amber-300') : 'border-line bg-elevated/60 text-ink-muted line-through'}`}>
                {p.id}
              </span>
            ))}
            {delivery.review?.provider && (
              <span className="rounded border border-line-strong/30 bg-accent/10 px-1.5 py-0.5 text-[9px] text-ink">review: {delivery.review.provider}</span>
            )}
            <button onClick={() => setConfigOpen((o) => !o)} className="rounded border border-line px-1.5 py-0.5 text-[9px] text-ink-subtle hover:text-emerald-300 hover:border-emerald-500/40 transition-colors">config</button>
          </div>

          {configOpen && (
            <div className="rounded-lg border border-line bg-surface p-2 space-y-1.5">
              <div className="text-[9px] font-semibold uppercase tracking-wider text-ink-muted">CodeRabbit (cloud review — approval required)</div>
              <div className="flex gap-1">
                <input value={crCli} onChange={(e) => setCrCli(e.target.value)} placeholder="CLI path (default: coderabbit / cr)" className="min-w-0 flex-1 rounded border border-line bg-surface px-1.5 py-1 text-[10px] text-ink placeholder:text-ink-muted outline-none focus:border-emerald-500/50" />
                <input value={crKey} onChange={(e) => setCrKey(e.target.value)} placeholder="API key (optional)" type="password" className="min-w-0 flex-1 rounded border border-line bg-surface px-1.5 py-1 text-[10px] text-ink placeholder:text-ink-muted outline-none focus:border-emerald-500/50" />
              </div>
              <div className="text-[9px] text-ink-muted">CodeRabbit is a cloud service. Enabling it sends your git diff to the CodeRabbit API. Local CLI review mode is preferred; PR/GitHub integration is optional.</div>
              <button onClick={enableCodeRabbit} className="rounded bg-emerald-600/80 hover:bg-emerald-500 px-2 py-1 text-[10px] font-medium text-ink transition-colors">Enable + approve</button>
            </div>
          )}

          {/* GSD phases timeline */}
          {phases.length > 0 && (
            <div className="space-y-0.5">
              <div className="text-[9px] font-semibold uppercase tracking-wider text-ink-muted">GSD phases · {phases.filter((p) => p.status === 'done').length}/{phases.length}</div>
              {phases.map((phase) => (
                <div key={phase.id} className="rounded border border-line/70">
                  <button onClick={() => setExpandedPhase((e) => (e === phase.id ? null : phase.id))} className="w-full flex items-center gap-1.5 px-1.5 py-1 text-left hover:bg-elevated/30 transition-colors">
                    {expandedPhase === phase.id ? <ChevronDown className="w-3 h-3 text-ink-muted" /> : <ChevronRight className="w-3 h-3 text-ink-muted" />}
                    {phase.status === 'done' ? <CheckCircle2 className="w-3 h-3 text-emerald-400" /> : phase.status === 'running' ? <Loader2 className="w-3 h-3 text-ink-muted animate-spin" /> : <CircleDashed className="w-3 h-3 text-ink-muted" />}
                    <span className={`truncate text-[10px] ${phase.status === 'done' ? 'text-ink' : 'text-ink-muted'}`}>{phase.name}</span>
                    <span className="ml-auto text-[9px] text-ink-muted">{phase.tasks?.filter((t: any) => t.status === 'done').length || 0}/{phase.tasks?.length || 0}</span>
                  </button>
                  {expandedPhase === phase.id && (
                    <div className="px-2 pb-1.5 space-y-0.5">
                      {(phase.tasks || []).map((t: any) => (
                        <div key={t.id} className="flex items-center gap-1.5">
                          {t.status === 'done' ? <CheckCircle2 className="w-2.5 h-2.5 text-emerald-400/80 shrink-0" /> : t.status === 'failed' ? <XCircle className="w-2.5 h-2.5 text-rose-400 shrink-0" /> : <CircleDashed className="w-2.5 h-2.5 text-ink-muted shrink-0" />}
                          <span className="truncate text-[9px] text-ink-subtle">{t.name}</span>
                          {t.iterations?.length ? <span className="ml-auto shrink-0 rounded bg-amber-500/10 border border-amber-500/30 px-1 text-[8px] text-amber-300">RALPH {t.iterations[t.iterations.length - 1].count}×</span> : null}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* RALPH supervision */}
          {iterations.length > 0 && (
            <div className="space-y-0.5">
              <div className="text-[9px] font-semibold uppercase tracking-wider text-ink-muted">RALPH supervision</div>
              {lastIteration && (
                <div className="rounded border border-amber-500/20 bg-amber-500/[0.04] px-1.5 py-1">
                  <div className="flex items-center gap-1.5">
                    <Activity className={`w-3 h-3 ${lastIteration.passed ? 'text-emerald-400' : 'text-amber-400'}`} />
                    <span className="text-[9px] text-ink-subtle">iteration {lastIteration.attempts} {lastIteration.passed ? 'passed' : 'failed'}</span>
                    <span className="ml-auto text-[9px] text-ink-muted">{lastIteration.command || lastIteration.label}</span>
                  </div>
                  {lastIteration.output && <pre className="mt-1 max-h-16 overflow-y-auto whitespace-pre-wrap break-words rounded bg-surface/80 p-1 text-[8px] leading-3 text-ink-muted">{lastIteration.output}</pre>}
                </div>
              )}
              <div className="flex flex-wrap gap-1">
                {Object.entries(perStage).slice(-5).map(([label, s]: [string, any]) => (
                  <span key={label} title={label} className={`rounded border px-1 py-0.5 text-[8px] ${s.passed ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300' : 'border-amber-500/30 bg-amber-500/10 text-amber-300'}`}>
                    {s.passed ? '✓' : '✗'} {s.attempts}/3 · {s.repairs} fix
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* CodeRabbit findings */}
          {findings.length > 0 && (
            <div className="space-y-0.5">
              <div className="text-[9px] font-semibold uppercase tracking-wider text-ink-muted">Review findings · {delivery.review?.provider || 'review'}</div>
              {findings.slice(0, 8).map((f, i) => {
                const s = sev(f.severity);
                return (
                  <div key={f.id || i} className={`rounded border border-l-2 px-1.5 py-1 ${s.cls}`} style={{ borderLeftColor: (s.dot || '').replace('bg-', '#') }}>
                    <div className="flex items-center gap-1">
                      <span className={`h-1.5 w-1.5 rounded-full ${s.dot} shrink-0`} />
                      <span className="text-[9px] font-medium">{s.label}</span>
                      <span className="truncate text-[9px] text-ink-subtle">{f.file}{f.line ? `:${f.line}` : ''}</span>
                    </div>
                    <p className="mt-0.5 text-[9px] leading-relaxed text-ink-subtle line-clamp-2">{f.title || f.message}</p>
                  </div>
                );
              })}
              {findings.length > 8 && <div className="text-[8px] text-ink-muted">+{findings.length - 8} more</div>}
            </div>
          )}

          {/* Verification + gates + evidence */}
          {report && (
            <div className="space-y-1">
              <div className="text-[9px] font-semibold uppercase tracking-wider text-ink-muted">Gates — {report.completed ? 'COMPLETED' : 'not passed'}</div>
              <div className="flex flex-wrap gap-1">
                {Object.entries(report.gates || {}).map(([k, v]) => (
                  <span key={k} className={`rounded border px-1.5 py-0.5 text-[9px] ${v ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300' : 'border-rose-500/40 bg-rose-500/10 text-rose-300'}`}>
                    {k} {v ? '✓' : '✗'}
                  </span>
                ))}
              </div>
              {blockers.length > 0 && (
                <div className="space-y-0.5">
                  {blockers.map((b, i) => (
                    <div key={i} className="flex items-center gap-1 text-[9px] text-rose-300"><XCircle className="w-2.5 h-2.5 shrink-0" />{b}</div>
                  ))}
                </div>
              )}
              {(report.evidence || []).slice(-5).map((e: string, i: number) => (
                <div key={i} className="truncate text-[8px] text-ink-muted font-mono" title={e}>{e}</div>
              ))}
            </div>
          )}

          {verification && !report && (
            <div className="flex flex-wrap gap-1">
              {['build', 'test', 'runtime'].map((k) => {
                const v = (verification as any)[k];
                if (!v) return null;
                const passed = k === 'runtime' ? v.passed === true : v.exitCode === 0;
                return (
                  <span key={k} className={`rounded border px-1.5 py-0.5 text-[9px] ${passed ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300' : 'border-amber-500/30 bg-amber-500/10 text-amber-300'}`} title={String(v.output || '').slice(0, 300)}>
                    {k} {passed ? '✓' : '✗'} {k === 'runtime' ? '' : v.exitCode ?? ''}
                  </span>
                );
              })}
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-wrap gap-1 pt-0.5">
            {waitingState && task.id && (
              <button onClick={doContinue} disabled={continuing} className="flex items-center gap-1 rounded border border-line-strong/40 bg-accent/10 px-2 py-1 text-[9px] text-ink hover:bg-accent/20 transition-colors disabled:opacity-50">
                {continuing ? <Loader2 className="w-3 h-3 animate-spin" /> : <PlayCircle className="w-3 h-3" />} Continue after review
              </button>
            )}
            <button onClick={doRollback} disabled={rollbacking || running} className="flex items-center gap-1 rounded border border-amber-500/40 bg-amber-500/10 px-2 py-1 text-[9px] text-amber-200 hover:bg-amber-500/20 transition-colors disabled:opacity-40">
              {rollbacking ? <Loader2 className="w-3 h-3 animate-spin" /> : <RotateCcw className="w-3 h-3" />} Rollback to phase snapshot
            </button>
          </div>
        </div>
      )}
    </div>
  );
}