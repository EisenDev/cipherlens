import { motion, AnimatePresence } from 'framer-motion';

interface ConfirmationDialogProps {
  isOpen: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel: string;
  isDestructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmationDialog({
  isOpen,
  title,
  description,
  confirmLabel,
  cancelLabel,
  isDestructive = false,
  onConfirm,
  onCancel,
}: ConfirmationDialogProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onCancel}
            className="absolute inset-0 bg-black/30 backdrop-blur-sm"
          />

          {/* Modal Content */}
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="relative w-full max-w-sm bg-white rounded-3xl border border-border-warm p-6 shadow-xl z-10"
          >
            {/* Title */}
            <h3 
              className="text-base font-bold text-text-primary mb-3"
              style={{ fontFamily: 'var(--font-heading)' }}
            >
              {title}
            </h3>

            {/* Description */}
            <p 
              className="text-[11px] text-text-muted leading-relaxed mb-6"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              {description}
            </p>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onCancel}
                className="px-3.5 py-2 rounded-xl border border-border-warm bg-white hover:bg-bg-primary text-[10px] font-bold text-text-primary transition-colors cursor-pointer"
              >
                {cancelLabel}
              </button>
              <button
                type="button"
                onClick={onConfirm}
                className={`px-3.5 py-2 rounded-xl text-[10px] font-bold text-white transition-all cursor-pointer shadow-sm ${
                  isDestructive
                    ? 'bg-red-600 hover:bg-red-700 border border-red-700'
                    : 'bg-accent hover:bg-accent/90 border border-accent'
                }`}
              >
                {confirmLabel}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
