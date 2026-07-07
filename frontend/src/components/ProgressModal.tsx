import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useScanProgress, useScanLogs } from '../hooks/useScans';

interface ProgressModalProps {
  isOpen: boolean;
  scanId: string | null;
  onClose: () => void;
}

export default function ProgressModal({ isOpen, scanId, onClose }: ProgressModalProps) {
  const { data: progress } = useScanProgress(scanId, isOpen);
  const { data: logsData } = useScanLogs(scanId, isOpen);
  const logEndRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll logs terminal
  useEffect(() => {
    if (logEndRef.current) {
      logEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logsData]);

  const formatTime = (isoString: string | null) => {
    if (!isoString) return '--';
    const d = new Date(isoString);
    return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  const formatElapsedTime = (seconds: number | null) => {
    if (seconds === null) return '0s';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return m > 0 ? `${m}m ${s}s` : `${s}s`;
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

          {/* Modal Container */}
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="relative w-full max-w-xl bg-white rounded-3xl border border-border-warm shadow-xl z-10 overflow-hidden flex flex-col max-h-[85vh]"
          >
            {/* Header */}
            <div className="px-6 py-5 border-b border-border-warm flex justify-between items-center bg-bg-primary">
              <div>
                <h3 className="text-sm font-bold text-text-primary" style={{ fontFamily: 'var(--font-heading)' }}>
                  Scan Progress details
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
              {/* Meta stats bar */}
              <div className="grid grid-cols-3 gap-4 p-4 rounded-2xl bg-bg-primary border border-border-warm font-semibold">
                <div>
                  <p className="text-[9px] text-text-muted">Current status</p>
                  <p className="text-xs text-text-primary uppercase mt-0.5 select-none font-mono">
                    {progress?.status || 'RUNNING'}
                  </p>
                </div>
                <div>
                  <p className="text-[9px] text-text-muted">Started time</p>
                  <p className="text-xs text-text-primary mt-0.5 select-none font-mono">
                    {formatTime(progress?.startedAt || null)}
                  </p>
                </div>
                <div>
                  <p className="text-[9px] text-text-muted">Elapsed time</p>
                  <p className="text-xs text-text-primary mt-0.5 select-none font-mono">
                    {formatElapsedTime(progress?.elapsedTime || null)}
                  </p>
                </div>
              </div>

              {/* Modules Progress List */}
              <div>
                <h4 className="text-[10px] font-bold text-text-primary uppercase tracking-wider mb-3 select-none">
                  Module execution progress
                </h4>
                <div className="space-y-3">
                  {progress?.modules.map((mod) => (
                    <div key={mod.name} className="flex items-center justify-between text-[10px]">
                      <div className="w-20 font-bold text-text-secondary select-none font-mono">{mod.name}</div>
                      
                      {/* Custom progress bar */}
                      <div className="flex-1 mx-3 h-2.5 bg-bg-secondary rounded-full overflow-hidden border border-border-warm relative">
                        <div
                          className={`h-full transition-all duration-500 rounded-full ${
                            mod.status === 'COMPLETED' ? 'bg-emerald-600' :
                            mod.status === 'RUNNING' ? 'bg-blue-500 animate-pulse' :
                            mod.status === 'FAILED' ? 'bg-red-600' : 'bg-transparent'
                          }`}
                          style={{ width: `${mod.progress}%` }}
                        />
                      </div>
                      
                      {/* Status indicator */}
                      <div className="w-16 text-right select-none font-semibold font-mono">
                        {mod.status === 'COMPLETED' && <span className="text-emerald-700">Done</span>}
                        {mod.status === 'RUNNING' && <span className="text-blue-600">{mod.progress}%</span>}
                        {mod.status === 'FAILED' && <span className="text-red-700">Failed</span>}
                        {mod.status === 'WAITING' && <span className="text-text-muted">Waiting</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Execution Info */}
              {progress?.currentlyExecuting && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-blue-800 text-[10px] font-medium animate-pulse">
                  ⚡ Currently executing: <span className="font-bold">{progress.currentlyExecuting}</span>
                </div>
              )}

              {/* Live Logs terminal */}
              <div>
                <h4 className="text-[10px] font-bold text-text-primary uppercase tracking-wider mb-2 select-none">
                  Live execution logs
                </h4>
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 h-48 overflow-y-auto font-mono text-[9px] text-slate-350 space-y-1.5 leading-relaxed shadow-inner">
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
                  {(!logsData || logsData.logs.length === 0) && (
                    <div className="text-slate-500 italic text-center py-12">No logs recorded yet.</div>
                  )}
                  <div ref={logEndRef} />
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-border-warm flex justify-end bg-bg-primary">
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-white border border-border-warm hover:bg-bg-primary text-[10px] font-bold text-text-primary transition-colors cursor-pointer"
              >
                Close Progress view
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
