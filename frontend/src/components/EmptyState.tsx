interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export default function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center bg-bg-card rounded-3xl border border-border-warm shadow-sm py-16">
      {/* Icon Wrapper */}
      <div className="w-12 h-12 rounded-2xl bg-bg-secondary border border-border-warm flex items-center justify-center text-text-muted mb-4">
        {icon}
      </div>

      {/* Title */}
      <h3 
        className="text-sm font-bold text-text-primary mb-2"
        style={{ fontFamily: 'var(--font-heading)' }}
      >
        {title}
      </h3>

      {/* Description */}
      <p 
        className="text-[11px] text-text-muted max-w-sm mb-6 leading-relaxed"
        style={{ fontFamily: 'var(--font-body)' }}
      >
        {description}
      </p>

      {/* Optional CTA */}
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="px-4 py-2 rounded-xl bg-accent text-white hover:bg-accent/90 text-[10px] font-bold transition-all shadow-sm cursor-pointer"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
