import type { FC } from 'react';

interface LoadingScreenProps {
  title?: string;
  subtitle?: string;
  fullPage?: boolean;
}

/**
 * LoadingScreen — A standardized, premium loading component.
 * Uses the warm ivory aesthetic and a gold circular spinning ring.
 */
export const LoadingScreen: FC<LoadingScreenProps> = ({
  title = 'Loading Scan Results',
  subtitle = 'Fetching security metrics and vulnerability logs...',
  fullPage = true
}) => {
  const loaderMarkup = (
    <div className="flex flex-col items-center gap-4 text-center select-none">
      <div className="relative flex items-center justify-center">
        {/* Background ring */}
        <div className="w-10 h-10 rounded-full border-4 border-border" />
        {/* Animated gold ring */}
        <svg className="w-10 h-10 animate-spin absolute" style={{ color: '#C4933F' }} fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      </div>
      <div className="space-y-1">
        <p className="text-sm font-bold text-text-primary" style={{ color: 'var(--color-text-primary)', fontFamily: 'var(--font-heading, Inter, sans-serif)' }}>
          {title}
        </p>
        {subtitle && (
          <p className="text-[10px] font-medium text-text-muted" style={{ color: 'var(--color-text-muted)' }}>
            {subtitle}
          </p>
        )}
      </div>
    </div>
  );

  if (fullPage) {
    return (
      <div className="min-h-screen bg-bg-primary flex items-center justify-center p-6">
        {loaderMarkup}
      </div>
    );
  }

  return (
    <div className="py-20 flex items-center justify-center p-6 w-full">
      {loaderMarkup}
    </div>
  );
};
