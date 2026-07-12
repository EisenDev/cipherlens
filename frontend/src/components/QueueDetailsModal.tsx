import { motion, AnimatePresence } from 'framer-motion';
import { useScanProgress } from '../hooks/useScans';

interface QueueDetailsModalProps {
  isOpen: boolean;
  scanId: string | null;
  onClose: () => void;
}

export default function QueueDetailsModal({ isOpen, scanId, onClose }: QueueDetailsModalProps) {
  const { data: progress } = useScanProgress(scanId, isOpen);

  const formatDateTime = (isoString: string | null) => {
    if (!isoString) return '--';
    const d = new Date(isoString);
    return d.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  // Generate a mock stable queue position based on scanId
  const getQueuePosition = (id: string | null) => {
    if (!id) return 1;
    const charCodeSum = id.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
    return (charCodeSum % 5) + 1; // Position between 1 and 5
  };

  const queuePos = getQueuePosition(scanId);

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

          {/* Modal Content */}
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="relative w-full max-w-md bg-bg-card rounded-3xl border border-border-warm shadow-xl z-10 overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="px-6 py-5 border-b border-border-warm flex justify-between items-center bg-bg-primary">
              <div>
                <h3 className="text-sm font-bold text-text-primary" style={{ fontFamily: 'var(--font-heading)' }}>
                  Queue Details
                </h3>
                <p className="text-[9px] text-text-muted mt-1 select-none font-mono">
                  Target: {progress?.targetUrl || '--'}
                </p>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full border border-border-warm bg-bg-card hover:bg-bg-primary text-text-muted hover:text-text-primary flex items-center justify-center cursor-pointer transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Content Body */}
            <div className="p-6 space-y-6 text-xs text-text-primary">
              {/* Queue Position and Meta Card */}
              <div className="grid grid-cols-2 gap-4 p-4 rounded-2xl bg-bg-primary border border-border-warm font-semibold">
                <div>
                  <p className="text-[9px] text-text-muted">Queue Position</p>
                  <p className="text-sm text-accent font-bold mt-0.5 select-none font-mono">
                    #{queuePos}
                  </p>
                </div>
                <div>
                  <p className="text-[9px] text-text-muted">Estimated start</p>
                  <p className="text-xs text-text-primary mt-0.5 select-none font-mono">
                    ~{queuePos * 45} seconds
                  </p>
                </div>
              </div>

              {/* Time Log */}
              <div className="space-y-2">
                <div className="flex justify-between border-b border-border-warm/50 pb-2">
                  <span className="text-text-muted">Submitted time</span>
                  <span className="font-semibold font-mono">{formatDateTime(progress?.startedAt || null)}</span>
                </div>
                <div className="flex justify-between border-b border-border-warm/50 pb-2">
                  <span className="text-text-muted">Scheduled by</span>
                  <span className="font-semibold font-mono">Platform Queue Scheduler</span>
                </div>
              </div>

              {/* Selected Modules Checklist */}
              <div>
                <h4 className="text-[10px] font-bold text-text-primary uppercase tracking-wider mb-3 select-none">
                  Configured modules checklist
                </h4>
                <div className="grid grid-cols-2 gap-2.5">
                  {progress?.modules.map((mod) => (
                    <div 
                      key={mod.name} 
                      className="flex items-center gap-2 p-2.5 rounded-xl border border-border-warm bg-bg-primary"
                    >
                      <div className="w-1.5 h-1.5 rounded-full bg-accent" />
                      <span className="text-[10px] font-medium text-text-secondary select-none font-mono">
                        {mod.name}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-border-warm flex justify-end bg-bg-primary">
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-bg-card border border-border-warm hover:bg-bg-primary text-[10px] font-bold text-text-primary transition-colors cursor-pointer"
              >
                Close Queue details
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
