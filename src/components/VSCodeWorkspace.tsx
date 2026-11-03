import React, { useState, useEffect } from 'react';
import { Loader2, AlertCircle } from 'lucide-react';

const VSCodeWorkspace = () => {
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const startServer = async () => {


      try {
        const res = await fetch('http://localhost:5000/api/vscode/start-server', { method: 'POST' });
        if (!res.ok) throw new Error('Failed to start VS Code server');
        
        // Wait 4 seconds for the server to initialize fully
        setTimeout(() => setIsReady(true), 4000);
      } catch (e: any) {
        setError(e.message);
      }
    };

    startServer();
  }, []);

  return (
    <div className="flex-1 flex flex-col h-full bg-canvas overflow-hidden relative">
      {/* ── Error Overlay ── */}
      {error && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-canvas text-red-400 space-y-4">
          <AlertCircle className="w-12 h-12" />
          <p className="text-lg font-semibold uppercase tracking-widest">{error}</p>
          <p className="text-xs text-ink-subtle text-center max-w-sm uppercase leading-relaxed">
            Ensure VS Code is installed and 'code' command is available.
          </p>
        </div>
      )}

      {/* ── Loading Overlay ── */}
      {!isReady && !error && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-canvas text-ink-muted space-y-6">
          <div className="relative">
            <Loader2 className="w-20 h-20 animate-spin opacity-20" />
            <div className="absolute inset-0 flex items-center justify-center">
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8"><path d="M23.15 2.587L18.21.21a1.494 1.494 0 0 0-1.705.29l-9.46 8.63-4.12-3.128a.999.999 0 0 0-1.276.057L.327 7.261A1 1 0 0 0 .326 8.74L3.899 12 .326 15.26a1 1 0 0 0 .001 1.479L1.65 17.94a.999.999 0 0 0 1.276.057l4.12-3.128 9.46 8.63a1.492 1.492 0 0 0 1.704.29l4.942-2.377A1.5 1.5 0 0 0 24 20.06V3.939a1.5 1.5 0 0 0-.85-1.352zm-5.146 14.861L10.826 12l7.178-5.448v10.896z"/></svg>
            </div>
          </div>
          <div className="text-center">
            <h2 className="text-xl font-light tracking-[0.3em] text-ink uppercase">Neural IDE Integration</h2>
            <p className="text-[10px] mt-3 text-ink-subtle uppercase tracking-[0.2em] font-bold animate-pulse">Starting Official VS Code Web Interface...</p>
          </div>
        </div>
      )}

      {/* ── Persistent VS Code Iframe ── */}
      <iframe 
        src="http://localhost:8000" 
        className="w-full h-full border-none"
        title="Official VS Code Web"
        allow="clipboard-read; clipboard-write; terminal; fullscreen"
      />
    </div>
  );
};


export default VSCodeWorkspace;
