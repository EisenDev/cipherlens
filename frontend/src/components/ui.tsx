import React from 'react';
import { Link } from 'react-router-dom';
import { motion, type Variants } from 'framer-motion';

// ============================================================
// Animation Presets — Reuse across all pages
// ============================================================
export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.5, ease: 'easeOut' } },
};

export const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } },
};

export const fadeInLeft: Variants = {
  hidden: { opacity: 0, x: -24 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.5, ease: 'easeOut' } },
};

export const fadeInRight: Variants = {
  hidden: { opacity: 0, x: 24 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.5, ease: 'easeOut' } },
};

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.4, ease: 'easeOut' } },
};

export const staggerContainer: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
};

// ============================================================
// Section Container
// ============================================================
interface SectionContainerProps {
  children: React.ReactNode;
  className?: string;
  id?: string;
  bg?: 'primary' | 'secondary' | 'white';
}

export function SectionContainer({ children, className = '', id, bg = 'primary' }: SectionContainerProps) {
  const bgMap = {
    primary: 'bg-bg-primary',
    secondary: 'bg-bg-secondary',
    white: 'bg-bg-card',
  };
  return (
    <section id={id} className={`section-padding ${bgMap[bg]} ${className}`}>
      <div className="container-main">{children}</div>
    </section>
  );
}

// ============================================================
// Section Header
// ============================================================
interface SectionHeaderProps {
  eyebrow?: string;
  title: string;
  description?: string;
  centered?: boolean;
  className?: string;
}

export function SectionHeader({ eyebrow, title, description, centered = true, className = '' }: SectionHeaderProps) {
  return (
    <motion.div
      className={`mb-16 ${centered ? 'text-center' : ''} ${className}`}
      variants={fadeInUp}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: '-80px' }}
    >
      {eyebrow && (
        <p className="text-eyebrow mb-4">{eyebrow}</p>
      )}
      <h2 className="text-section-title mb-5">{title}</h2>
      {description && (
        <p className="text-body max-w-xl mx-auto leading-relaxed">{description}</p>
      )}
    </motion.div>
  );
}

// ============================================================
// Button
// ============================================================
interface ButtonProps {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'ghost' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  onClick?: () => void;
  className?: string;
  href?: string;
  type?: 'button' | 'submit';
  disabled?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
}

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  onClick,
  className = '',
  href,
  type = 'button',
  disabled,
  icon,
  iconPosition = 'right',
}: ButtonProps) {
  const variantClass = `btn-${variant}`;
  const sizeClass = size === 'lg' ? 'btn-lg' : size === 'sm' ? 'btn-sm' : '';

  const content = (
    <>
      {icon && iconPosition === 'left' && <span className="flex-shrink-0">{icon}</span>}
      {children}
      {icon && iconPosition === 'right' && <span className="flex-shrink-0">{icon}</span>}
    </>
  );

  if (href) {
    const isInternal = href.startsWith('/') && !href.startsWith('//');
    if (isInternal) {
      return (
        <Link
          to={href}
          className={`btn ${variantClass} ${sizeClass} ${className} flex items-center justify-center gap-1.5`}
        >
          {content}
        </Link>
      );
    }
    return (
      <motion.a
        href={href}
        className={`btn ${variantClass} ${sizeClass} ${className}`}
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.98 }}
      >
        {content}
      </motion.a>
    );
  }

  return (
    <motion.button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`btn ${variantClass} ${sizeClass} ${className}`}
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.98 }}
    >
      {content}
    </motion.button>
  );
}

// ============================================================
// Card
// ============================================================
interface CardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  muted?: boolean;
  accent?: boolean;
}

export function Card({ children, className = '', hover = false, muted = false, accent = false }: CardProps) {
  const classes = [
    'card',
    hover ? 'card-hover cursor-pointer' : '',
    muted ? 'card-muted' : '',
    accent ? 'card-accent' : '',
    className,
  ].join(' ');

  if (hover) {
    return (
      <motion.div
        className={classes}
        whileHover={{ y: -3, boxShadow: 'var(--shadow-hover)' }}
        transition={{ duration: 0.2 }}
      >
        {children}
      </motion.div>
    );
  }

  return <div className={classes}>{children}</div>;
}

// ============================================================
// Badge
// ============================================================
interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'accent' | 'success' | 'warning' | 'danger' | 'info';
  className?: string;
  icon?: React.ReactNode;
}

export function Badge({ children, variant = 'default', className = '', icon }: BadgeProps) {
  return (
    <span className={`badge badge-${variant} ${className}`}>
      {icon && <span className="flex-shrink-0">{icon}</span>}
      {children}
    </span>
  );
}

// ============================================================
// Icon Wrapper
// ============================================================
interface IconWrapperProps {
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'accent' | 'muted';
  className?: string;
}

export function IconWrapper({ children, size = 'md', variant = 'default', className = '' }: IconWrapperProps) {
  const sizeMap = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
  };
  const variantMap = {
    default: 'bg-bg-secondary border-border-warm text-text-secondary',
    accent: 'bg-accent-subtle border-accent-light text-accent',
    muted: 'bg-bg-muted border-divider text-text-muted',
  };

  return (
    <div className={`${sizeMap[size]} ${variantMap[variant]} border rounded-xl flex items-center justify-center flex-shrink-0 ${className}`}>
      {children}
    </div>
  );
}

// ============================================================
// Divider
// ============================================================
export function Divider({ className = '' }: { className?: string }) {
  return <hr className={`divider ${className}`} />;
}

// ============================================================
// Feature Card
// ============================================================
interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  link?: string;
  linkLabel?: string;
  className?: string;
}

export function FeatureCard({ icon, title, description, link, linkLabel = 'Learn more', className = '' }: FeatureCardProps) {
  return (
    <motion.div
      className={`card card-hover p-8 flex flex-col gap-5 ${className}`}
      variants={fadeInUp}
      whileHover={{ y: -4 }}
      transition={{ duration: 0.2 }}
    >
      <IconWrapper variant="default">{icon}</IconWrapper>
      <div>
        <h3 className="text-card-title mb-2">{title}</h3>
        <p className="text-body-sm">{description}</p>
      </div>
      {link && (
        <a
          href={link}
          className="text-sm font-medium text-accent hover:text-accent-dark flex items-center gap-1 mt-auto transition-colors"
          style={{ fontFamily: 'var(--font-body)' }}
        >
          {linkLabel}
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </a>
      )}
    </motion.div>
  );
}

// ============================================================
// Timeline Item
// ============================================================
interface TimelineItemProps {
  step: number;
  icon: React.ReactNode;
  title: string;
  description: string;
  isLast?: boolean;
}

export function TimelineItem({ icon, title, description, isLast = false }: TimelineItemProps) {
  return (
    <motion.div className="flex flex-col items-center text-center px-4" variants={fadeInUp}>
      <div className="relative flex flex-col items-center w-full mb-5">
        {/* Icon circle */}
        <div
          className="w-14 h-14 rounded-full flex items-center justify-center flex-shrink-0 relative z-10"
          style={{
            background: 'var(--color-accent-subtle)',
            border: '1.5px solid var(--color-accent-light)',
            color: 'var(--color-accent)',
          }}
        >
          {icon}
        </div>
        {/* Connecting line to the right — sits at vertical center of the circle */}
        {!isLast && (
          <div
            className="hidden md:block absolute"
            style={{
              top: '28px',
              left: 'calc(50% + 28px)',
              right: 'calc(-50% + 28px)',
              height: '1px',
              background: 'var(--color-border)',
            }}
          />
        )}
      </div>
      <h4 className="font-semibold text-text-primary text-sm mb-1.5" style={{ fontFamily: 'var(--font-body)' }}>{title}</h4>
      <p className="text-xs text-text-secondary leading-relaxed max-w-[140px]">{description}</p>
    </motion.div>
  );
}
