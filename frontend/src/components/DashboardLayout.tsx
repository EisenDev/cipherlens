import React from 'react';
import Sidebar from './Sidebar';
import Topbar from './Topbar';

interface DashboardLayoutProps {
  children: React.ReactNode;
  activePage: string;
}

export default function DashboardLayout({ children, activePage }: DashboardLayoutProps) {
  return (
    <div className="min-h-screen bg-bg-primary text-text-primary flex overflow-hidden relative transition-colors duration-200">
      {/* Static Left Sidebar */}
      <Sidebar activePage={activePage} />

      {/* Main content body with static topbar and scrollable content panel */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        {/* Static Top Header */}
        <Topbar />

        {/* Scrollable Content Container */}
        <div className="flex-1 overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
}
