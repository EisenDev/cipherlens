import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

export default function Card({ children, className = '', onClick }: CardProps) {
  return (
    <div
      onClick={onClick}
      className={`bg-bg-card border border-border-warm rounded-3xl p-5 shadow-sm transition-all transition-colors duration-200 ${
        onClick ? 'cursor-pointer hover:border-border-strong hover:shadow-md' : ''
      } ${className}`}
    >
      {children}
    </div>
  );
}
