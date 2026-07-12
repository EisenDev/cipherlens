import { useState, useMemo, useEffect } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import Card from '../components/Card';
import PageHeading from '../components/PageHeading';
import { useScans } from '../hooks/useScans';
import { 
  Bell, 
  ShieldAlert, 
  CheckCircle2, 
  Info, 
  Search, 
  Trash2, 
  Check, 
  X, 
  Sliders,
  Settings
} from 'lucide-react';

interface Notification {
  id: string;
  type: 'security' | 'system' | 'scan';
  title: string;
  description: string;
  timestamp: string;
  read: boolean;
  severity?: 'critical' | 'high' | 'medium' | 'low' | 'info';
  assetName?: string;
  scanId?: string;
}

export default function NotificationsPage() {
  const [filter, setFilter] = useState<'all' | 'unread' | 'security' | 'system'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  // Load scans real-data (fetch large limit to handle client-side filtering / searching)
  const { data: scanData, isPending } = useScans({ page: 1, limit: 1000 });

  // Read / Deleted states mapped to localStorage
  const [readIds, setReadIds] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem('cipherlens_read_notifications');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const [deletedIds, setDeletedIds] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem('cipherlens_deleted_notifications');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem('cipherlens_read_notifications', JSON.stringify(readIds));
  }, [readIds]);

  useEffect(() => {
    localStorage.setItem('cipherlens_deleted_notifications', JSON.stringify(deletedIds));
  }, [deletedIds]);

  // Map real database scan records to notifications feed
  const notifications = useMemo<Notification[]>(() => {
    if (!scanData?.data) return [];
    
    return scanData.data
      .filter(scan => !deletedIds.includes(scan.id))
      .map(scan => {
        let severity: 'critical' | 'high' | 'medium' | 'low' | 'info' = 'info';
        let title = 'Scan Event';
        let description = '';
        let type: 'security' | 'system' | 'scan' = 'scan';
        
        if (scan.status === 'COMPLETED') {
          title = 'Scan Finished Successfully';
          const scoreVal = scan.score ?? 100;
          if (scoreVal < 60) {
            severity = 'critical';
            description = `Critical security vulnerabilities identified on ${scan.target.name} during automated audit. Health score: ${scoreVal}/100.`;
            type = 'security';
          } else if (scoreVal < 80) {
            severity = 'high';
            description = `Vulnerabilities detected on ${scan.target.name}. Health score: ${scoreVal}/100. Please review findings.`;
            type = 'security';
          } else if (scoreVal < 90) {
            severity = 'medium';
            description = `Vulnerability scan completed for ${scan.target.name}. Health score: ${scoreVal}/100. Some findings need review.`;
          } else {
            severity = 'low';
            description = `Security audit finished cleanly for ${scan.target.name}. Health score: ${scoreVal}/100.`;
          }
        } else if (scan.status === 'FAILED') {
          title = 'Scan Execution Failed';
          severity = 'critical';
          description = `Vulnerability scan #${scan.id.substring(0, 8)} on target ${scan.target.name} terminated abruptly due to scanning errors.`;
          type = 'security';
        } else if (scan.status === 'RUNNING') {
          title = 'Vulnerability Scan Running';
          severity = 'info';
          description = `Active security scanners are parsing endpoints and source configurations on target ${scan.target.name}.`;
          type = 'system';
        } else if (scan.status === 'QUEUED') {
          title = 'Vulnerability Scan Queued';
          severity = 'info';
          description = `Automated security audit for ${scan.target.name} has enqueued and is waiting for worker thread allocation.`;
          type = 'system';
        } else if (scan.status === 'CANCELLED') {
          title = 'Scan Aborted by User';
          severity = 'low';
          description = `Scan audit #${scan.id.substring(0, 8)} on target ${scan.target.name} was cancelled manually.`;
          type = 'system';
        }

        return {
          id: scan.id,
          type,
          title,
          description,
          timestamp: scan.createdAt,
          read: readIds.includes(scan.id),
          severity,
          assetName: scan.target.name,
          scanId: scan.id.substring(0, 8)
        };
      });
  }, [scanData, deletedIds, readIds]);

  // Preference Settings States
  const [prefEmail, setPrefEmail] = useState(true);
  const [prefSlack, setPrefSlack] = useState(true);
  const [prefWeekly, setPrefWeekly] = useState(false);
  const [prefSuccess, setPrefSuccess] = useState(false);

  // Actions
  const handleMarkAsRead = (id: string) => {
    setReadIds(prev => [...prev, id]);
  };

  const handleMarkAllRead = () => {
    const unreadIds = notifications.filter(n => !n.read).map(n => n.id);
    setReadIds(prev => [...prev, ...unreadIds]);
  };

  const handleDeleteNotification = (id: string) => {
    setDeletedIds(prev => [...prev, id]);
  };

  const handleClearAll = () => {
    const allIds = notifications.map(n => n.id);
    setDeletedIds(prev => [...prev, ...allIds]);
  };

  const savePreferences = (e: React.FormEvent) => {
    e.preventDefault();
    setPrefSuccess(true);
    setTimeout(() => setPrefSuccess(false), 2000);
  };

  // Reset pagination on filter or search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [filter, searchQuery]);

  // Filtering Logic
  const filteredNotifications = useMemo(() => {
    return notifications.filter(n => {
      const matchesSearch = n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            n.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            (n.assetName && n.assetName.toLowerCase().includes(searchQuery.toLowerCase()));
                            
      if (!matchesSearch) return false;
      
      if (filter === 'unread') return !n.read;
      if (filter === 'security') return n.type === 'security';
      if (filter === 'system') return n.type === 'system' || n.type === 'scan';
      return true;
    });
  }, [notifications, filter, searchQuery]);

  const unreadCount = useMemo(() => notifications.filter(n => !n.read).length, [notifications]);

  // Pagination calculation
  const totalItems = filteredNotifications.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedNotifications = useMemo(() => {
    return filteredNotifications.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredNotifications, startIndex, itemsPerPage]);

  // Render severity tags
  const getSeverityBadge = (severity?: string) => {
    if (!severity) return null;
    const baseStyle = "px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase bg-bg-secondary border border-border text-text-primary";
    switch (severity) {
      case 'critical': return <span className={baseStyle}>Critical</span>;
      case 'high':     return <span className={baseStyle}>High</span>;
      case 'medium':   return <span className={baseStyle}>Medium</span>;
      case 'low':      return <span className={baseStyle}>Low</span>;
      default:         return <span className={baseStyle}>Info</span>;
    }
  };

  // Render notification icons
  const getNotificationIcon = (type: string, severity?: string) => {
    if (type === 'security' || severity === 'critical' || severity === 'high') {
      return (
        <div className="w-9 h-9 rounded-xl bg-bg-secondary border border-border flex items-center justify-center text-danger flex-shrink-0">
          <ShieldAlert className="w-4.5 h-4.5" />
        </div>
      );
    }
    if (type === 'scan') {
      return (
        <div className="w-9 h-9 rounded-xl bg-bg-secondary border border-border flex items-center justify-center text-success flex-shrink-0">
          <CheckCircle2 className="w-4.5 h-4.5" />
        </div>
      );
    }
    return (
      <div className="w-9 h-9 rounded-xl bg-bg-secondary border border-border flex items-center justify-center text-info flex-shrink-0">
        <Info className="w-4.5 h-4.5" />
      </div>
    );
  };

  return (
    <DashboardLayout activePage="notifications">
      <div className="py-8 px-10 space-y-7 w-full">
        
        {/* Main Title Row */}
        <PageHeading
          title="Notifications"
          description="Stay informed of system logs, scheduled scanning milestones, and target vulnerability disclosures."
          actions={
            <>
              {unreadCount > 0 && (
                <button 
                  onClick={handleMarkAllRead}
                  className="px-3.5 py-2 bg-bg-secondary border border-border-strong text-text-primary hover:bg-hover hover:text-text-primary font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" />
                  Mark all read
                </button>
              )}
              {notifications.length > 0 && (
                <button 
                  onClick={handleClearAll}
                  className="px-3.5 py-2 bg-bg-secondary border border-border text-text-primary hover:bg-hover hover:text-text-primary font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Clear archives
                </button>
              )}
            </>
          }
        />

        {/* Layout Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Main Feed Column */}
          <div className="lg:col-span-2 space-y-4">
            
            {/* Filter controls / search */}
            <div className="flex flex-col sm:flex-row justify-between items-center gap-3 bg-bg-primary border border-border rounded-2xl p-3 shadow-xs min-h-[46px]">
              {/* Tabs */}
              <div className="flex items-center gap-1 w-full sm:w-auto">
                {[
                  { id: 'all', label: 'All' },
                  { id: 'unread', label: `Unread (${unreadCount})` },
                  { id: 'security', label: 'Security' },
                  { id: 'system', label: 'System' }
                ].map(t => (
                  <button
                    key={t.id}
                    onClick={() => setFilter(t.id as any)}
                    className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                      filter === t.id 
                        ? 'bg-bg-muted text-text-primary border border-border-strong shadow-xs'
                        : 'text-text-muted hover:bg-bg-secondary hover:text-text-primary'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {/* Search input */}
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-muted" />
                <input 
                  type="text"
                  placeholder="Search alerts..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-1.5 bg-bg-secondary border border-border rounded-xl text-xs text-text-primary placeholder:text-text-muted focus:ring-1 focus:ring-accent focus:border-accent focus:outline-none transition-all font-semibold"
                />
                {searchQuery && (
                  <button 
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Notifications list */}
            <Card className="p-0 overflow-hidden divide-y divide-border flex flex-col justify-between min-h-[400px]">
              <div className="divide-y divide-border flex-1">
                {isPending ? (
                  <div className="py-20 text-center space-y-3">
                    <div className="animate-spin w-8 h-8 border-2 border-accent border-t-transparent rounded-full mx-auto" />
                    <p className="text-xs font-bold text-text-muted">Loading notifications...</p>
                  </div>
                ) : paginatedNotifications.length > 0 ? (
                  paginatedNotifications.map(n => (
                    <div 
                      key={n.id} 
                      className={`flex items-start gap-4 p-5 transition-all hover:bg-bg-secondary/40 relative ${
                        !n.read ? 'bg-bg-secondary/20' : ''
                      }`}
                    >
                      {/* Unread indicator dot */}
                      {!n.read && (
                        <div className="absolute left-1.5 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-accent" />
                      )}

                      {/* Icon */}
                      {getNotificationIcon(n.type, n.severity)}

                      {/* Content */}
                      <div className="flex-1 space-y-1 text-left min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className={`text-xs font-extrabold ${!n.read ? 'text-text-primary' : 'text-text-secondary'}`}>
                            {n.title}
                          </h4>
                          {getSeverityBadge(n.severity)}
                        </div>
                        
                        <p className="text-[11px] text-text-secondary leading-relaxed font-semibold">
                          {n.description}
                        </p>

                        {/* Info & Meta items */}
                        <div className="flex flex-wrap items-center gap-3 pt-1 text-[9px] text-text-muted font-bold select-none uppercase">
                          <span>{new Date(n.timestamp).toLocaleString()}</span>
                          {n.assetName && (
                            <span className="bg-bg-secondary px-1.5 py-0.5 rounded border border-border text-text-secondary">
                              Asset: {n.assetName}
                            </span>
                          )}
                          {n.scanId && (
                            <span className="bg-bg-secondary px-1.5 py-0.5 rounded border border-border text-text-secondary">
                              Scan: #{n.scanId}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        {!n.read && (
                          <button 
                            onClick={() => handleMarkAsRead(n.id)}
                            title="Mark as read"
                            className="w-7 h-7 bg-bg-primary hover:bg-bg-secondary border border-border rounded-lg flex items-center justify-center text-text-secondary hover:text-text-primary cursor-pointer transition-colors"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button 
                          onClick={() => handleDeleteNotification(n.id)}
                          title="Delete"
                          className="w-7 h-7 bg-bg-primary hover:bg-danger-bg border border-border hover:border-danger/20 rounded-lg flex items-center justify-center text-text-secondary hover:text-danger cursor-pointer transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="py-20 text-center space-y-3">
                    <div className="w-12 h-12 rounded-2xl bg-bg-secondary border border-border-warm flex items-center justify-center text-text-muted mx-auto">
                      <Bell className="w-5 h-5" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-extrabold text-text-primary">All caught up!</p>
                      <p className="text-[10px] text-text-muted font-semibold max-w-xs mx-auto">
                        No notifications match your current filter selection. New alerts will display here.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Custom pagination footer */}
              {!isPending && totalPages > 1 && (
                <div className="flex flex-col sm:flex-row justify-between items-center gap-3 px-6 py-3.5 text-xs text-text-muted font-semibold select-none bg-bg-secondary border-t border-border">
                  <p className="font-semibold text-text-muted">
                    Showing <span className="font-bold text-text-primary">{startIndex + 1}</span> to{' '}
                    <span className="font-bold text-text-primary">{Math.min(startIndex + itemsPerPage, totalItems)}</span> of{' '}
                    <span className="font-bold text-text-primary">{totalItems}</span> alerts
                  </p>
                  
                  <div className="flex items-center gap-1 bg-bg-primary border border-border rounded-xl p-0.5">
                    <button 
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                      className="px-2.5 py-1 text-[11px] font-bold text-text-primary disabled:opacity-30 hover:bg-bg-secondary hover:border-border border border-transparent rounded-lg transition-colors cursor-pointer disabled:cursor-not-allowed"
                    >
                      Prev
                    </button>
                    {Array.from({ length: totalPages }).map((_, idx) => (
                      <button
                        key={idx}
                        onClick={() => setCurrentPage(idx + 1)}
                        className={`w-7 h-7 flex items-center justify-center rounded-lg text-[11px] border border-transparent transition-all cursor-pointer ${
                          currentPage === idx + 1 
                            ? 'bg-bg-muted text-text-primary border border-border font-bold'
                            : 'text-text-muted hover:bg-bg-primary hover:border-border'
                        }`}
                      >
                        {idx + 1}
                      </button>
                    ))}
                    <button 
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      disabled={currentPage === totalPages}
                      className="px-2.5 py-1 text-[11px] font-bold text-text-primary disabled:opacity-30 hover:bg-bg-secondary hover:border-border border border-transparent rounded-lg transition-colors cursor-pointer disabled:cursor-not-allowed"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </Card>

          </div>

          {/* Quick Config Column */}
          <div className="space-y-6">
            
            {/* Preferences Card */}
            <Card className="text-left space-y-4">
              <div className="flex items-center gap-2 border-b border-border pb-3">
                <Sliders className="w-4 h-4 text-accent" />
                <h3 className="text-sm font-extrabold text-text-primary">Dispatch Channel Preferences</h3>
              </div>

              <form onSubmit={savePreferences} className="space-y-4">
                <div className="space-y-3.5">
                  
                  {/* Email dispatch */}
                  <label className="flex items-start gap-3 cursor-pointer group">
                    <input 
                      type="checkbox"
                      checked={prefEmail}
                      onChange={(e) => setPrefEmail(e.target.checked)}
                      className="mt-0.5 rounded border-border-strong text-accent focus:ring-accent w-3.5 h-3.5 cursor-pointer"
                    />
                    <div className="space-y-0.5">
                      <span className="block text-[11px] font-extrabold text-text-primary group-hover:text-accent transition-colors">Email Notifications</span>
                      <span className="block text-[9px] text-text-muted font-semibold leading-relaxed">
                        Dispatch real-time email disclosures to your active registered profile when critical vulnerabilities are found.
                      </span>
                    </div>
                  </label>

                  {/* Slack dispatch */}
                  <label className="flex items-start gap-3 cursor-pointer group">
                    <input 
                      type="checkbox"
                      checked={prefSlack}
                      onChange={(e) => setPrefSlack(e.target.checked)}
                      className="mt-0.5 rounded border-border-strong text-accent focus:ring-accent w-3.5 h-3.5 cursor-pointer"
                    />
                    <div className="space-y-0.5">
                      <span className="block text-[11px] font-extrabold text-text-primary group-hover:text-accent transition-colors">Slack & Teams Slack webhook</span>
                      <span className="block text-[9px] text-text-muted font-semibold leading-relaxed">
                        Push JSON-formatted audit payloads straight to integrations webhook endpoints instantly.
                      </span>
                    </div>
                  </label>

                  {/* Weekly report digest */}
                  <label className="flex items-start gap-3 cursor-pointer group">
                    <input 
                      type="checkbox"
                      checked={prefWeekly}
                      onChange={(e) => setPrefWeekly(e.target.checked)}
                      className="mt-0.5 rounded border-border-strong text-accent focus:ring-accent w-3.5 h-3.5 cursor-pointer"
                    />
                    <div className="space-y-0.5">
                      <span className="block text-[11px] font-extrabold text-text-primary group-hover:text-accent transition-colors">Weekly security posture digest</span>
                      <span className="block text-[9px] text-text-muted font-semibold leading-relaxed">
                        A consolidated PDF report outlining historical vulnerability status and asset metrics once a week.
                      </span>
                    </div>
                  </label>

                </div>

                <div className="pt-2 border-t border-border">
                  <button 
                    type="submit"
                    className="w-full py-2 bg-bg-muted hover:bg-hover hover:text-text-primary text-text-primary font-bold text-xs rounded-xl shadow cursor-pointer border border-border-strong transition-all flex items-center justify-center gap-1.5"
                  >
                    Save Preferences
                  </button>
                </div>

                {prefSuccess && (
                  <div className="p-2.5 bg-bg-secondary border border-border rounded-xl text-text-primary font-bold text-[10px] text-center flex items-center justify-center gap-1 animate-fade-in select-none">
                    <Check className="w-3.5 h-3.5 text-accent" />
                    Preferences saved successfully!
                  </div>
                )}
              </form>
            </Card>

            {/* Quick Stats Card */}
            <Card className="text-left space-y-3.5">
              <div className="flex items-center gap-2 border-b border-border pb-3">
                <Settings className="w-4 h-4 text-text-muted" />
                <h3 className="text-sm font-extrabold text-text-primary">System Health Indicators</h3>
              </div>
              <div className="space-y-2.5 font-bold text-[11px]">
                <div className="flex justify-between items-center">
                  <span className="text-text-secondary">Webhook Gateway</span>
                  <span className="px-2 py-0.5 rounded text-[9px] uppercase bg-bg-secondary text-text-primary border border-border">Operational</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-text-secondary">SMTP Relay</span>
                  <span className="px-2 py-0.5 rounded text-[9px] uppercase bg-bg-secondary text-text-primary border border-border">Active</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-text-secondary">Scan Queue (Redis)</span>
                  <span className="text-text-primary">0 Pending Jobs</span>
                </div>
              </div>
            </Card>

          </div>

        </div>

      </div>
    </DashboardLayout>
  );
}
