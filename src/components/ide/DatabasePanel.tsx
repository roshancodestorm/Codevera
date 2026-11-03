import React, { useCallback, useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, Cloud, Database, Globe, Loader2, Play, Plus, RefreshCw, Table2, Unplug } from 'lucide-react';
import { ideApi } from './ideApi';

interface TableMeta {
  name: string;
  rowCount: number;
  columns: { name: string; type: string; pk: boolean }[];
}

interface Props {
  workspace: string;
  onToast: (msg: string) => void;
}

const HOSTED_PROVIDERS: { id: string; label: string; hint: string }[] = [
  { id: 'render', label: 'Render', hint: 'npm i -g @renderinc/cli' },
  { id: 'railway', label: 'Railway', hint: 'npm i -g @railway/cli' },
  { id: 'fly', label: 'Fly.io', hint: 'npm i -g @fly.io/flyctl' },
];

export default function DatabasePanel({ workspace, onToast }: Props) {
  const [mode, setMode] = useState<'local' | 'hosted'>('local');
  const [exists, setExists] = useState(false);
  const [tables, setTables] = useState<TableMeta[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [tableData, setTableData] = useState<{ columns: string[]; rows: Record<string, unknown>[]; total: number } | null>(null);
  const [tableLoading, setTableLoading] = useState(false);
  const [sql, setSql] = useState('');
  const [queryResult, setQueryResult] = useState<{ ok: boolean; columns?: string[]; rows?: Record<string, unknown>[]; changes?: number; error?: string } | null>(null);
  const [querying, setQuerying] = useState(false);
  // hosted state
  const [hosted, setHosted] = useState<{ connected: boolean; status?: string; urlMasked?: string; provider?: string | null; provisioned?: boolean; tables?: TableMeta[]; output?: string }>({ connected: false });
  const [hostedUrl, setHostedUrl] = useState('');
  const [hostedBusy, setHostedBusy] = useState(false);
  const [provisionProvider, setProvisionProvider] = useState('render');

  const refresh = useCallback(async () => {
    if (!workspace) return;
    setLoading(true);
    try {
      const r = await ideApi.dbTables(workspace);
      setExists(r.exists);
      setTables(r.tables);
      if (r.tables.length > 0 && !selectedTable) setSelectedTable(r.tables[0].name);
    } catch {}
    setLoading(false);
  }, [workspace, selectedTable]);

  const refreshHosted = useCallback(async () => {
    if (!workspace) return;
    try {
      const r = await ideApi.dbHostedStatus(workspace);
      setHosted(r);
    } catch {}
  }, [workspace]);

  useEffect(() => { refresh(); }, [refresh]);
  useEffect(() => { refreshHosted(); }, [refreshHosted]);

  useEffect(() => {
    if (mode === 'hosted' && hosted.connected && !hosted.tables?.length) refreshHosted();
  }, [mode, hosted.connected, hosted.tables?.length, refreshHosted]);

  const loadTable = useCallback(async (name: string) => {
    setTableLoading(true);
    setTableData(null);
    try {
      const r = await ideApi.dbTable(workspace, name, 0, 100);
      setTableData(r);
    } catch {}
    setTableLoading(false);
  }, [workspace]);

  useEffect(() => {
    if (selectedTable) loadTable(selectedTable);
  }, [selectedTable, loadTable]);

  const createDb = async () => {
    setCreating(true);
    try {
      const r = await ideApi.dbCreate(workspace);
      if (r.ok) {
        onToast('Database created — DATABASE_URL injected in .env');
        await refresh();
      } else {
        onToast('Failed to create database');
      }
    } catch (err: any) {
      onToast(`Error: ${err.message}`);
    } finally {
      setCreating(false);
    }
  };

  const runQuery = async () => {
    if (!sql.trim()) return;
    setQuerying(true);
    setQueryResult(null);
    try {
      if (mode === 'hosted') {
        const r = await ideApi.dbHostedQuery(workspace, sql);
        setQueryResult(r);
        if (r.ok && r.changes !== undefined && r.changes > 0) await refreshHosted();
      } else {
        const r = await ideApi.dbQuery(workspace, sql);
        setQueryResult(r);
        if (r.ok && r.changes !== undefined && r.changes > 0) {
          await refresh();
          if (selectedTable) await loadTable(selectedTable);
        }
      }
    } catch (err: any) {
      setQueryResult({ ok: false, error: err.message });
    } finally {
      setQuerying(false);
    }
  };

  const connectHosted = async () => {
    setHostedBusy(true);
    setQueryResult(null);
    try {
      const r = await ideApi.dbHostedConnect(workspace, hostedUrl.trim() || undefined);
      setHosted(r);
      onToast(r.connected ? `Connected to hosted Postgres` : `Could not connect`);
    } catch (err: any) {
      setQueryResult({ ok: false, error: err.message });
    } finally {
      setHostedBusy(false);
    }
  };

  const provisionHosted = async () => {
    setHostedBusy(true);
    setQueryResult(null);
    try {
      await ideApi.dbHostedProvision(workspace, provisionProvider);
      onToast(`Provisioning ${provisionProvider} Postgres… this takes a minute`);
      setTimeout(refreshHosted, 4000);
    } catch (err: any) {
      setQueryResult({ ok: false, error: err.message });
    } finally {
      setHostedBusy(false);
    }
  };

  const disconnectHosted = async () => {
    try {
      await ideApi.dbHostedDisconnect(workspace);
      setHosted({ connected: false });
      setQueryResult(null);
    } catch {}
  };

  const modeBtn = (m: 'local' | 'hosted', label: string) => (
    <button
      onClick={() => setMode(m)}
      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors ${mode === m ? 'bg-accent/15 text-ink border border-line-strong/30' : 'text-ink-muted hover:text-ink border border-transparent'}`}
    >
      {m === 'local' ? <Database className="w-3.5 h-3.5" /> : <Cloud className="w-3.5 h-3.5" />}
      {label}
    </button>
  );

  return (
    <div className="flex flex-col gap-3 h-full min-h-0 overflow-hidden">
      {/* Mode switcher */}
      <div className="flex items-center gap-2 shrink-0">
        {modeBtn('local', 'SQLite')}
        {modeBtn('hosted', 'Postgres')}
        <div className="ml-auto text-[11px] text-ink-muted">
          {mode === 'hosted'
            ? hosted.connected
              ? <span className="flex items-center gap-1 text-emerald-300"><Globe className="w-3 h-3" />{hosted.provider ? `${hosted.provider} · ` : ''}{hosted.urlMasked}</span>
              : <span className="text-ink-muted">Not connected</span>
            : loading ? <Loader2 className="w-3 h-3 animate-spin inline-block" /> : 'database.sqlite'}
        </div>
        <button onClick={() => { if (mode === 'hosted') refreshHosted(); else refresh(); }} className="p-1 rounded-md text-ink-muted hover:text-ink transition-colors" title="Refresh"><RefreshCw className="w-3 h-3" /></button>
      </div>

      {mode === 'hosted' ? (
        <div className="flex flex-col gap-3 flex-1 min-h-0 overflow-hidden">
          {/* Connect / provision controls */}
          <div className="shrink-0 rounded-lg border border-line bg-surface p-3 space-y-2">
            <div className="text-[10px] font-semibold tracking-widest text-ink-muted uppercase">Managed Postgres</div>
            {!hosted.connected && (
              <>
                <input
                  value={hostedUrl}
                  onChange={(e) => setHostedUrl(e.target.value)}
                  placeholder="postgres://user:pass@host:5432/db  (leave empty to use .env DATABASE_URL)"
                  className="w-full rounded-md border border-line bg-surface px-2.5 py-1.5 text-[10px] font-mono text-ink outline-none focus:border-line-strong/60 placeholder:text-ink-muted"
                />
                <button
                  onClick={connectHosted}
                  disabled={hostedBusy}
                  className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-md bg-accent hover:bg-accent text-[11px] text-accent-fg transition-colors disabled:opacity-40"
                >
                  {hostedBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Globe className="w-3.5 h-3.5" />} Connect
                </button>
                <div className="flex items-center gap-1.5">
                  <div className="flex-1 flex gap-1">
                    {HOSTED_PROVIDERS.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => setProvisionProvider(p.id)}
                        className={`flex-1 px-2 py-1 rounded-md text-[10px] transition-colors ${provisionProvider === p.id ? 'bg-accent/20 text-ink border border-line-strong/40' : 'bg-elevated/60 text-ink-muted hover:text-ink border border-transparent'}`}
                        title={p.hint}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={provisionHosted}
                    disabled={hostedBusy}
                    className="shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-md bg-emerald-600/20 text-emerald-300 hover:bg-emerald-600/30 text-[10px] transition-colors disabled:opacity-40"
                    title="Provision a managed Postgres on the selected provider via its CLI"
                  >
                    <Plus className="w-3 h-3" /> Provision
                  </button>
                </div>
                <p className="text-[9px] text-ink-muted leading-relaxed">
                  Provisioning requires the provider CLI on PATH (e.g. {HOSTED_PROVIDERS.find((p) => p.id === provisionProvider)?.hint}).
                  Connecting with a URL works without any CLI — the panel becomes a full hosted-Postgres browser.
                </p>
              </>
            )}
            {hosted.connected && (
              <>
                <div className={`text-[11px] ${hosted.status === 'error' ? 'text-rose-300' : 'text-emerald-300'}`}>
                  <CheckCircle2 className="w-3.5 h-3.5 inline-block mr-1.5" />
                  {hosted.status === 'connected' ? `Connected to hosted Postgres${hosted.provider ? ` (${hosted.provider})` : ''}` : hosted.status}
                </div>
                {hosted.output && <div className="text-[10px] text-ink-muted break-all leading-relaxed">{hosted.output}</div>}
                {hosted.tables && hosted.tables.length > 0 && (
                  <div className="text-[10px] text-ink-muted">{hosted.tables.length} tables in database</div>
                )}
                <button
                  onClick={disconnectHosted}
                  className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-md bg-elevated hover:bg-elevated text-[11px] text-ink transition-colors"
                >
                  <Unplug className="w-3.5 h-3.5" /> Disconnect
                </button>
              </>
            )}
          </div>

          {hosted.connected && (
            <div className="flex gap-2 flex-1 min-h-0 overflow-hidden">
              {/* Table list */}
              <div className="w-36 shrink-0 flex flex-col gap-1 overflow-y-auto">
                <div className="text-[10px] font-semibold text-ink-muted uppercase tracking-wider mb-0.5">Tables</div>
                {(hosted.tables || []).length === 0 && <div className="text-[10px] text-ink-muted">No tables</div>}
                {(hosted.tables || []).map((t) => (
                  <button
                    key={t.name}
                    className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-left transition-colors ${selectedTable === t.name ? 'bg-accent/20 text-ink border border-line-strong/30' : 'text-ink-subtle hover:bg-elevated/50 border border-transparent'}`}
                  >
                    <Table2 className="w-3 h-3 shrink-0" />
                    <span className="text-[10px] font-mono truncate">{t.name}</span>
                    <span className="ml-auto text-[9px] text-ink-muted">{t.rowCount}</span>
                  </button>
                ))}
              </div>
              {/* SQL runner */}
              <div className="flex-1 flex flex-col gap-2 min-w-0 overflow-hidden">
                <div className="shrink-0">
                  <div className="flex items-start gap-1.5">
                    <textarea
                      value={sql}
                      onChange={(e) => setSql(e.target.value)}
                      onKeyDown={(e) => { if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); runQuery(); } }}
                      placeholder="SQL query… (Ctrl+Enter to run)"
                      rows={2}
                      className="flex-1 px-2.5 py-1.5 rounded-lg border border-line bg-surface text-[11px] text-ink font-mono placeholder:text-ink-muted outline-none focus:border-line-strong/50 resize-none"
                    />
                    <button onClick={runQuery} disabled={querying || !sql.trim()} className="shrink-0 flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-accent text-accent-fg text-[11px] hover:bg-accent disabled:opacity-40 transition-colors">
                      {querying ? <Loader2 className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />}
                    </button>
                  </div>
                  {queryResult && (
                    <div className={`mt-1.5 px-2.5 py-1.5 rounded-lg border text-[10px] ${queryResult.ok ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-rose-500/30 bg-rose-500/5'}`}>
                      {queryResult.ok ? (
                        queryResult.changes !== undefined
                          ? <span className="text-emerald-300"><CheckCircle2 className="w-3 h-3 inline-block mr-1" />{queryResult.changes} row(s) affected</span>
                          : <span className="text-emerald-300"><CheckCircle2 className="w-3 h-3 inline-block mr-1" />{queryResult.rows?.length ?? 0} row(s)</span>
                      ) : (
                        <span className="text-rose-300"><AlertCircle className="w-3 h-3 inline-block mr-1" />{queryResult.error}</span>
                      )}
                    </div>
                  )}
                </div>
                {queryResult?.ok && queryResult.rows && queryResult.rows.length > 0 && (
                  <div className="flex-1 overflow-auto min-h-0"><DataTable columns={queryResult.columns!} rows={queryResult.rows} /></div>
                )}
                {(!queryResult || !queryResult.rows?.length) && hosted.tables && hosted.tables.length > 0 && (
                  <div className="flex-1 overflow-auto min-h-0">
                    {tableLoading ? <div className="flex items-center gap-1.5 text-[11px] text-ink-muted p-2"><Loader2 className="w-3 h-3 animate-spin" /> Loading…</div> : null}
                    {!tableLoading && <div className="text-[10px] text-ink-muted p-2">Run a query or pick a table in the hosted database.</div>}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      ) : (
        <>
          {!exists ? (
            <div className="flex flex-col items-center justify-center gap-4 h-full py-8">
              <Database className="w-10 h-10 text-ink-subtle" />
              <div className="text-center">
                <div className="text-[13px] text-ink font-medium mb-1">No database yet</div>
                <p className="text-[11px] text-ink-muted max-w-[220px] text-center">Create a SQLite database — `DATABASE_URL` will be auto-injected into your workspace `.env`. For a managed Postgres, switch to the Postgres tab above.</p>
              </div>
              <button
                onClick={createDb}
                disabled={creating}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-accent text-accent-fg text-[12px] font-medium hover:bg-accent disabled:opacity-50 transition-colors"
              >
                {creating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                New Database
              </button>
            </div>
          ) : (
            <>
              {/* Toolbar */}
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={createDb}
                  disabled={creating}
                  className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-elevated border border-line text-[10px] text-ink hover:bg-elevated disabled:opacity-50 transition-colors"
                >
                  <Plus className="w-3 h-3" /> New DB
                </button>
              </div>

              {/* Tables sidebar + data view */}
              <div className="flex gap-2 flex-1 min-h-0 overflow-hidden">
                <div className="w-36 shrink-0 flex flex-col gap-1 overflow-y-auto">
                  <div className="text-[10px] font-semibold text-ink-muted uppercase tracking-wider mb-0.5">Tables</div>
                  {tables.length === 0 && !loading && <div className="text-[10px] text-ink-muted">No tables yet</div>}
                  {tables.map((t) => (
                    <button
                      key={t.name}
                      onClick={() => setSelectedTable(t.name)}
                      className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-left transition-colors ${selectedTable === t.name ? 'bg-accent/20 text-ink border border-line-strong/30' : 'text-ink-subtle hover:bg-elevated/50 border border-transparent'}`}
                    >
                      <Table2 className="w-3 h-3 shrink-0" />
                      <span className="text-[10px] font-mono truncate">{t.name}</span>
                      <span className="ml-auto text-[9px] text-ink-muted">{t.rowCount}</span>
                    </button>
                  ))}
                </div>

                <div className="flex-1 flex flex-col gap-2 min-w-0 overflow-hidden">
                  <div className="shrink-0">
                    <div className="flex items-start gap-1.5">
                      <textarea
                        value={sql}
                        onChange={(e) => setSql(e.target.value)}
                        onKeyDown={(e) => { if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); runQuery(); } }}
                        placeholder="SQL query… (Ctrl+Enter to run)"
                        rows={2}
                        className="flex-1 px-2.5 py-1.5 rounded-lg border border-line bg-surface text-[11px] text-ink font-mono placeholder:text-ink-muted outline-none focus:border-line-strong/50 resize-none"
                      />
                      <button onClick={runQuery} disabled={querying || !sql.trim()} className="shrink-0 flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-accent text-accent-fg text-[11px] hover:bg-accent disabled:opacity-40 transition-colors">
                        {querying ? <Loader2 className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />}
                      </button>
                    </div>
                    {queryResult && (
                      <div className={`mt-1.5 px-2.5 py-1.5 rounded-lg border text-[10px] ${queryResult.ok ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-rose-500/30 bg-rose-500/5'}`}>
                        {queryResult.ok ? (
                          queryResult.changes !== undefined
                            ? <span className="text-emerald-300"><CheckCircle2 className="w-3 h-3 inline-block mr-1" />{queryResult.changes} row(s) affected</span>
                            : <span className="text-emerald-300"><CheckCircle2 className="w-3 h-3 inline-block mr-1" />{queryResult.rows?.length ?? 0} row(s)</span>
                        ) : (
                          <span className="text-rose-300"><AlertCircle className="w-3 h-3 inline-block mr-1" />{queryResult.error}</span>
                        )}
                      </div>
                    )}
                  </div>

                  {queryResult?.ok && queryResult.rows && queryResult.rows.length > 0 && (
                    <div className="flex-1 overflow-auto min-h-0"><DataTable columns={queryResult.columns!} rows={queryResult.rows} /></div>
                  )}

                  {(!queryResult || !queryResult.rows?.length) && selectedTable && (
                    <div className="flex-1 overflow-auto min-h-0">
                      {tableLoading ? (
                        <div className="flex items-center gap-1.5 text-[11px] text-ink-muted p-2"><Loader2 className="w-3 h-3 animate-spin" /> Loading…</div>
                      ) : tableData ? (
                        <DataTable columns={tableData.columns} rows={tableData.rows} total={tableData.total} />
                      ) : null}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}

function DataTable({ columns, rows, total }: { columns: string[]; rows: Record<string, unknown>[]; total?: number }) {
  if (!columns.length) return <div className="text-[11px] text-ink-muted p-2">No results</div>;
  return (
    <div className="overflow-auto max-h-full rounded-lg border border-line">
      {total !== undefined && total > rows.length && (
        <div className="px-2.5 py-1 border-b border-line text-[10px] text-ink-muted">Showing {rows.length} of {total} rows</div>
      )}
      <table className="w-full text-[11px] font-mono border-collapse">
        <thead>
          <tr className="bg-surface/80">
            {columns.map((c) => (
              <th key={c} className="text-left px-2.5 py-1 text-[10px] font-semibold text-ink-subtle uppercase tracking-wider border-b border-line whitespace-nowrap">{c}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className={i % 2 === 0 ? 'bg-transparent' : 'bg-surface/20'}>
              {columns.map((c) => {
                const val = row[c];
                const display = val === null ? <span className="text-ink-muted italic">null</span> : String(val);
                return (
                  <td key={c} className="px-2.5 py-1 text-ink border-b border-line/40 whitespace-nowrap max-w-[200px] truncate" title={String(val ?? '')}>
                    {display}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      {rows.length === 0 && <div className="px-3 py-2 text-[11px] text-ink-muted">Empty table</div>}
    </div>
  );
}
