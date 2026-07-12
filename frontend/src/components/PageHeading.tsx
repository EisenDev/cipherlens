import React from 'react';
import { Link } from 'react-router-dom';
import { PagesFontSize } from './PagesFontSize';

export interface BreadcrumbItem {
  label: string;
  to?: string;
}

interface PageHeadingProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  breadcrumbs?: BreadcrumbItem[];
}

export default function PageHeading({ title, description, actions, breadcrumbs }: PageHeadingProps) {
  return (
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 w-full text-left">
      <div>
        {/* Render Breadcrumbs if present */}
        {breadcrumbs && breadcrumbs.length > 0 && (
          <div className="text-xs text-text-muted flex items-center gap-1.5 mb-1.5 font-semibold select-none">
            {breadcrumbs.map((crumb, idx) => {
              const isLast = idx === breadcrumbs.length - 1;
              return (
                <React.Fragment key={idx}>
                  {crumb.to && !isLast ? (
                    <Link to={crumb.to} className="hover:text-text-primary transition-colors text-xs font-semibold text-text-muted">
                      {crumb.label}
                    </Link>
                  ) : (
                    <span className={`text-xs ${isLast ? 'text-text-primary font-bold' : 'text-text-muted font-semibold'}`}>
                      {crumb.label}
                    </span>
                  )}
                  {!isLast && <span className="text-text-muted text-[10px] font-bold">&gt;</span>}
                </React.Fragment>
              );
            })}
          </div>
        )}
        
        <h1 className={PagesFontSize.heading} style={{ fontFamily: 'var(--font-heading)' }}>
          {title}
        </h1>
        {description && (
          <p className={PagesFontSize.subheading} style={{ fontFamily: 'var(--font-body)' }}>
            {description}
          </p>
        )}
      </div>

      {actions && (
        <div className="flex flex-wrap gap-3 items-center w-full sm:w-auto">
          {actions}
        </div>
      )}
    </div>
  );
}
