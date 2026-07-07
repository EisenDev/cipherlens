import { motion, AnimatePresence } from 'framer-motion';
import { useScanProgress, useScanLogs } from '../hooks/useScans';

interface ErrorModalProps {
  isOpen: boolean;
  scanId: string | null;
  onClose: () => void;
}

export default function ErrorModal({ isOpen, scanId, onClose }: ErrorModalProps) {
  const { data: progress } = useScanProgress(scanId, isOpen);
  const { data: logsData } = useScanLogs(scanId, isOpen);

  // Locate the failed module if any
  const failedModule = progress?.modules.find((mod) => mod.status === 'FAILED');

  const formatTime = (isoString: string | null) => {
    if (!isoString) return '--';
    const d = new Date(isoString);
    return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  return (
    <AnimatePresence>
      {isOpen && scanId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/35 backdrop-blur-sm"
          />

          {/* Modal Content Container */}
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="relative w-full max-w-xl bg-white rounded-3xl border border-border-warm shadow-xl z-10 overflow-hidden flex flex-col max-h-[85vh]"
          >
            {/* Header */}
            <div className="px-6 py-5 border-b border-border-warm flex justify-between items-center bg-bg-primary">
              <div>
                <h3 className="text-sm font-bold text-red-700 flex items-center gap-1.5" style={{ fontFamily: 'var(--font-heading)' }}>
                  ⚠️ Scan Failure Report
                </h3>
                <p className="text-[9px] text-text-muted mt-1 select-none font-mono">
                  Target: {progress?.targetUrl || '--'}
                </p>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full border border-border-warm bg-white hover:bg-bg-primary text-text-muted hover:text-text-primary flex items-center justify-center cursor-pointer transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Content Body */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
              {/* Failure Summary Panel */}
              <div className="p-4 bg-red-50 border border-red-200 rounded-2xl space-y-3">
                <div>
                  <p className="text-[9px] text-red-500 font-bold uppercase select-none tracking-wider">Failure Title</p>
                  <p className="text-xs font-bold text-red-950 mt-0.5">
                    Scanner Module Exception
                  </p>
                </div>
                
                <div className="grid grid-cols-2 gap-4 pt-1">
                  <div>
                    <p className="text-[9px] text-red-500 font-bold uppercase select-none tracking-wider">Failed Module</p>
                    <p className="text-[10px] font-bold text-red-900 font-mono mt-0.5">
                      {failedModule?.name || 'OWASP'}
                    </p>
                  </div>
                  <div>
                    <p className="text-[9px] text-red-500 font-bold uppercase select-none tracking-wider">Timestamp</p>
                    <p className="text-[10px] font-bold text-red-900 font-mono mt-0.5">
                      {formatTime(progress?.startedAt || null)}
                    </p>
                  </div>
                </div>

                <div className="border-t border-red-200/50 pt-2.5">
                  <p className="text-[9px] text-red-500 font-bold uppercase select-none tracking-wider">Error Message</p>
                  <p className="text-[10px] font-medium text-red-950 mt-1 leading-relaxed">
                    Connection timeout during port audit checking. Host socket rejected requests.
                  </p>
                </div>
              </div>

              {/* Error Details */}
              <div>
                <h4 className="text-[10px] font-bold text-text-primary uppercase tracking-wider mb-2 select-none">
                  Error Exception Traceback
                </h4>
                <pre className="bg-bg-primary border border-border-warm rounded-2xl p-4 text-[9px] font-mono text-text-secondary leading-relaxed overflow-x-auto max-h-32">
{`Traceback (most recent call last):
  File "scanner/engines/owasp.py", line 47, in run
    response = requests.get(target_url, timeout=self.timeout)
  File "requests/api.py", line 75, in get
  File "requests/sessions.py", line 546, in request
    resp = self.send(prep, **send_kwargs)
  File "requests/sessions.py", line 665, in send
    raise ConnectionTimeout(e, request=request)
requests.exceptions.ConnectionTimeout: ConnectTimeoutError(MaxRetryError("Connection to target timed out after 30 seconds"))`}
                </pre>
              </div>

              {/* Logs */}
              <div>
                <h4 className="text-[10px] font-bold text-text-primary uppercase tracking-wider mb-2 select-none">
                  Execution logs prior to failure
                </h4>
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 h-40 overflow-y-auto font-mono text-[9px] text-slate-350 space-y-1.5 leading-relaxed shadow-inner">
                  {logsData?.logs.map((log, i) => {
                    const time = new Date(log.timestamp).toLocaleTimeString('en-US', { hour12: false });
                    const levelColors = {
                      INFO: 'text-blue-400',
                      WARNING: 'text-amber-400',
                      ERROR: 'text-red-500'
                    };
                    return (
                      <div key={i} className="flex gap-2.5 items-start">
                        <span className="text-slate-500 select-none">[{time}]</span>
                        <span className={`font-bold select-none ${levelColors[log.level]}`}>
                          {log.level}
                        </span>
                        <span className="text-slate-100 flex-1 break-all">{log.message}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-border-warm flex justify-end bg-bg-primary">
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-white border border-border-warm hover:bg-bg-primary text-[10px] font-bold text-text-primary transition-colors cursor-pointer"
              >
                Close Failure report
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
