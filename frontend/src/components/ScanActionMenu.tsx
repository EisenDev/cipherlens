import { useState, useRef, useEffect } from 'react';
import type { ScanRecord } from '../hooks/useScans';

interface ScanActionMenuProps {
  scan: ScanRecord;
  onAction: (actionType: 'CANCEL' | 'DELETE' | 'RETRY' | 'DUPLICATE' | 'VIEW_PROGRESS' | 'VIEW_ERROR' | 'VIEW_DETAILS' | 'VIEW_RESULTS') => void;
}

export default function ScanActionMenu({ scan, onAction }: ScanActionMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Primary button based on status
  const renderPrimaryAction = () => {
    switch (scan.status) {
      case 'RUNNING':
        return (
          <button
            onClick={() => onAction('VIEW_PROGRESS')}
            className="px-3 py-1.5 rounded-lg border border-border-warm bg-white hover:bg-bg-primary text-[10px] font-bold text-text-primary transition-colors cursor-pointer shadow-sm select-none"
          >
            View Progress
          </button>
        );
      case 'QUEUED':
        return (
          <button
            onClick={() => onAction('VIEW_DETAILS')}
            className="px-3 py-1.5 rounded-lg border border-border-warm bg-white hover:bg-bg-primary text-[10px] font-bold text-text-primary transition-colors cursor-pointer shadow-sm select-none"
          >
            View Details
          </button>
        );
      case 'COMPLETED':
        return (
          <button
            onClick={() => onAction('VIEW_RESULTS')}
            className="px-3 py-1.5 rounded-lg border border-border-warm bg-white hover:bg-bg-primary text-[10px] font-bold text-text-primary transition-colors cursor-pointer shadow-sm select-none"
          >
            View Results
          </button>
        );
      case 'FAILED':
        return (
          <button
            onClick={() => onAction('VIEW_ERROR')}
            className="px-3 py-1.5 rounded-lg border border-red-200 bg-red-50 hover:bg-red-100 text-[10px] font-bold text-red-700 transition-colors cursor-pointer shadow-sm select-none"
          >
            View Error
          </button>
        );
      default: // CANCELLED
        return (
          <button
            onClick={() => onAction('VIEW_DETAILS')}
            className="px-3 py-1.5 rounded-lg border border-border-warm bg-white hover:bg-bg-primary text-[10px] font-bold text-text-primary transition-colors cursor-pointer shadow-sm select-none"
          >
            View Details
          </button>
        );
    }
  };

  // Additional options in dropdown based on status
  const renderDropdownItems = () => {
    const items = [];

    // Cancel option for running or queued
    if (scan.status === 'RUNNING' || scan.status === 'QUEUED') {
      items.push(
        <button
          key="cancel"
          onClick={() => {
            setIsOpen(false);
            onAction('CANCEL');
          }}
          className="w-full px-4 py-2 text-left hover:bg-bg-primary text-[10px] text-text-primary font-semibold flex items-center gap-2 cursor-pointer transition-colors"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
          Cancel Scan
        </button>
      );
    }

    // Retry option for failed
    if (scan.status === 'FAILED') {
      items.push(
        <button
          key="retry"
          onClick={() => {
            setIsOpen(false);
            onAction('RETRY');
          }}
          className="w-full px-4 py-2 text-left hover:bg-bg-primary text-[10px] text-text-primary font-semibold flex items-center gap-2 cursor-pointer transition-colors"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
          Retry Scan
        </button>
      );
    }

    // Duplicate option for completed or cancelled
    if (scan.status === 'COMPLETED' || scan.status === 'CANCELLED' || scan.status === 'FAILED') {
      items.push(
        <button
          key="duplicate"
          onClick={() => {
            setIsOpen(false);
            onAction('DUPLICATE');
          }}
          className="w-full px-4 py-2 text-left hover:bg-bg-primary text-[10px] text-text-primary font-semibold flex items-center gap-2 cursor-pointer transition-colors"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-accent" />
          Duplicate Scan
        </button>
      );
    }

    // Delete always available
    items.push(
      <button
        key="delete"
        onClick={() => {
          setIsOpen(false);
          onAction('DELETE');
        }}
        className="w-full px-4 py-2 text-left hover:bg-red-50 text-[10px] text-red-600 font-semibold flex items-center gap-2 cursor-pointer border-t border-border-warm/40 transition-colors"
      >
        <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
        Delete Scan
      </button>
    );

    return items;
  };

  return (
    <div className="relative inline-flex items-center gap-2" ref={menuRef}>
      {renderPrimaryAction()}

      {/* Options Dropdown trigger */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-8 h-8 rounded-xl border border-border-warm bg-white text-text-muted hover:text-text-primary flex items-center justify-center text-[10px] transition-colors cursor-pointer shadow-sm select-none focus:outline-none ${
          isOpen ? 'bg-bg-primary text-text-primary border-accent' : ''
        }`}
      >
        •••
      </button>

      {/* Dropdown Box */}
      {isOpen && (
        <div className="absolute right-0 top-9 w-36 bg-white rounded-2xl border border-border-warm shadow-lg py-2 z-30 divide-y divide-border-warm/40 overflow-hidden">
          {renderDropdownItems()}
        </div>
      )}
    </div>
  );
}
