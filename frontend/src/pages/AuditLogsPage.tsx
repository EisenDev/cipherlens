import { useState, useEffect } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import DashboardLayout from '../components/DashboardLayout';
import PageHeading from '../components/PageHeading';
import Card from '../components/Card';
import { apiRequest } from '../api/client';
import {
  Search,
  Clock,
  User as UserIcon,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Database,
  Filter,
  AlertCircle,
  Eye,
  X,
  FileCode,
} from 'lucide-react';

interface AuditLogItem {
  id: string;
  userId: string;
  userEmail: string;
  userFullName: string;
  action: string;
  timestamp: string;
  findingIds: string[];
  actionMetadata: Record<string, any>;
  createdAt: string;
}

export default function AuditLogsPage() {
  const authAccessToken = useAuthStore((state) => state.accessToken);

  // States
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedAction, setSelectedAction] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedLog, setSelectedLog] = useState<AuditLogItem | null>(null);

  // Debounce search
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
      setCurrentPage(1);
    }, 400);
    return () => clearTimeout(handler);
  }, [search]);

  // Fetch audit logs
  const fetchLogs = () => {
    if (!authAccessToken) return;
    setLoading(true);

    const queryParams = new URLSearchParams({
      page: String(currentPage),
      limit: String(pageSize),
    });

    if (debouncedSearch) queryParams.append('search', debouncedSearch);
    if (selectedAction) queryParams.append('action', selectedAction);

    apiRequest(`/api/audit-logs?${queryParams.toString()}`)
      .then((res) => {
        setLogs(res.data || []);
        setTotal(res.total || 0);
        setError(null);
      })
      .catch((err) => {
        setError(err.message || 'Failed to retrieve audit logs.');
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchLogs();
  }, [authAccessToken, currentPage, pageSize, debouncedSearch, selectedAction]);

  const totalPages = Math.ceil(total / pageSize);

  const getActionBadgeColor = (action: string) => {
    const act = action.toLowerCase();
    if (act.includes('delete') || act.includes('remove')) {
      return { bg: 'var(--color-danger-bg)', text: 'var(--color-danger)', border: 'rgba(224, 90, 106, 0.2)' };
    }
    if (act.includes('bulk_status') || act.includes('change') || act.includes('update')) {
      return { bg: 'var(--color-warning-bg)', text: 'var(--color-warning)', border: 'rgba(245, 158, 11, 0.2)' };
    }
    if (act.includes('ticket_creation') || act.includes('create')) {
      return { bg: 'var(--color-success-bg)', text: 'var(--color-success)', border: 'rgba(107, 175, 159, 0.2)' };
    }
    if (act.includes('export')) {
      return { bg: 'var(--color-info-bg)', text: 'var(--color-info)', border: 'rgba(96, 165, 250, 0.2)' };
    }
    return { bg: 'var(--color-bg-secondary)', text: 'var(--color-text-secondary)', border: 'var(--color-border)' };
  };

  const getActionLabel = (action: string) => {
    return action
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (char) => char.toUpperCase());
  };

  const formatTimestamp = (isoString: string) => {
    if (!isoString) return { local: '--', ago: '--' };
    const dateObj = new Date(isoString);
    const local = dateObj.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });

    const diffMs = Date.now() - dateObj.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHrs = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHrs / 24);

    let ago = '';
    if (diffMins < 1) ago = 'Just now';
    else if (diffMins < 60) ago = `${diffMins}m ago`;
    else if (diffHrs < 24) ago = `${diffHrs}h ago`;
    else ago = `${diffDays}d ago`;

    return { local, ago };
  };

  return (
    <DashboardLayout activePage="Audit Logs">
      <div className="py-8 px-10 space-y-7 w-full text-left">
        
        {/* Main Title Row */}
        <PageHeading
          title="Audit Logs"
          description="Track administrative actions, export triggers, vulnerability status updates, and platform compliance parameters."
        />

        {/* Filters and Controls */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
          
          {/* Search bar */}
          <div className="md:col-span-2 relative flex items-center">
            <span className="absolute left-4 text-text-muted">
              <Search className="w-4.5 h-4.5" />
            </span>
            <input
              type="text"
              placeholder="Search actor, action or specific key details..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-bg-card border border-border rounded-xl pl-11 pr-4 py-3 outline-none text-sm font-semibold text-text-primary transition-all duration-200 placeholder:text-text-muted focus:border-accent shadow-sm"
              style={{ fontFamily: 'var(--font-body)' }}
            />
          </div>

          {/* Action Filter */}
          <div className="relative flex items-center">
            <span className="absolute left-4 text-text-muted">
              <Filter className="w-4 h-4" />
            </span>
            <select
              value={selectedAction}
              onChange={(e) => {
                setSelectedAction(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full bg-bg-card border border-border rounded-xl pl-11 pr-4 py-3 outline-none text-sm font-semibold text-text-primary transition-all duration-200 cursor-pointer focus:border-accent shadow-sm appearance-none"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              <option value="">All Action Types</option>
              <option value="export">Export Payload</option>
              <option value="bulk_status_change">Bulk Status Update</option>
              <option value="bulk_assignment">Bulk Assignment</option>
              <option value="tag_change">Tag Alteration</option>
              <option value="archive">Archive Finding</option>
              <option value="delete">Delete Finding</option>
              <option value="ticket_creation">Ticket Dispatch</option>
            </select>
          </div>

          {/* Reset Filters */}
          {(search || selectedAction) && (
            <button
              onClick={() => {
                setSearch('');
                setSelectedAction('');
                setCurrentPage(1);
              }}
              className="px-4 py-3 bg-bg-secondary hover:bg-hover border border-border text-text-secondary hover:text-text-primary text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
            >
              <X className="w-4.5 h-4.5" />
              Reset Filters
            </button>
          )}
        </div>

        {/* Logs Table Card */}
        <Card className="p-0 overflow-hidden relative border border-border shadow-sm rounded-2xl">
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center gap-3">
              <div className="relative flex items-center justify-center">
                <div className="w-8 h-8 rounded-full border-4 border-border" />
                <svg className="w-8 h-8 animate-spin absolute text-accent" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              </div>
              <p className="text-xs text-text-muted font-semibold">Retrieving secure logs...</p>
            </div>
          ) : error ? (
            <div className="py-16 text-center space-y-3">
              <AlertCircle className="w-10 h-10 text-danger mx-auto" />
              <p className="text-sm font-bold text-text-primary">{error}</p>
              <button
                onClick={fetchLogs}
                className="px-3.5 py-1.5 bg-bg-secondary border border-border rounded-xl text-xs font-bold text-text-primary hover:bg-hover transition-all cursor-pointer"
              >
                Retry Request
              </button>
            </div>
          ) : logs.length === 0 ? (
            <div className="py-20 text-center space-y-3 select-none">
              <Database className="w-10 h-10 text-text-muted mx-auto" />
              <p className="text-sm font-bold text-text-primary">No matching audit logs recorded</p>
              <p className="text-xs text-text-muted">Perform platform modifications to trigger audit events.</p>
            </div>
          ) : (
            <div className="w-full">
              <div className="overflow-x-auto w-full">
                <table className="w-full text-left border-collapse table-auto">
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--color-divider)', background: 'var(--color-bg-secondary)' }}>
                      {['Actor', 'Action', 'Findings Scope', 'Timestamp', 'Detail'].map((h, i) => (
                        <th
                          key={i}
                          className="px-8 py-5.5 text-xs font-bold text-text-muted uppercase tracking-wider font-mono select-none"
                          style={{ fontFamily: 'var(--font-body)' }}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map((log) => {
                      const { local, ago } = formatTimestamp(log.timestamp);
                      const badge = getActionBadgeColor(log.action);
                      return (
                        <tr
                          key={log.id}
                          className="group border-b border-divider hover:bg-hover/40 transition-colors"
                          style={{ borderColor: 'var(--color-divider)' }}
                        >
                          {/* Actor */}
                          <td className="px-8 py-5.5">
                            <div className="flex items-center gap-4">
                              <div className="w-10 h-10 rounded-full bg-bg-secondary border border-border flex items-center justify-center text-text-secondary flex-shrink-0">
                                <UserIcon className="w-4.5 h-4.5" />
                              </div>
                              <div>
                                <p className="text-sm font-semibold text-text-primary leading-tight">
                                  {log.userFullName}
                                </p>
                                <p className="text-xs text-text-muted font-mono leading-tight mt-1 select-all">
                                  {log.userEmail}
                                </p>
                              </div>
                            </div>
                          </td>

                          {/* Action badge */}
                          <td className="px-8 py-5.5">
                            <span
                              className="px-3.5 py-1 rounded-full text-[10px] font-extrabold uppercase font-mono border"
                              style={{
                                background: badge.bg,
                                color: badge.text,
                                borderColor: badge.border,
                              }}
                            >
                              {getActionLabel(log.action)}
                            </span>
                          </td>

                          {/* Findings Scope count */}
                          <td className="px-8 py-5.5 font-mono text-xs">
                            {log.findingIds && log.findingIds.length > 0 ? (
                              <span className="text-text-primary font-bold">
                                {log.findingIds.length} {log.findingIds.length === 1 ? 'finding' : 'findings'}
                              </span>
                            ) : (
                              <span className="text-text-muted">N/A</span>
                            )}
                          </td>

                          {/* Timestamp info */}
                          <td className="px-8 py-5.5">
                            <div className="flex items-center gap-2">
                              <Clock className="w-4 h-4 text-text-muted flex-shrink-0" />
                              <div>
                                <p className="text-sm font-semibold text-text-primary leading-tight">
                                  {ago}
                                </p>
                                <p className="text-xs text-text-muted leading-tight mt-1">
                                  {local}
                                </p>
                              </div>
                            </div>
                          </td>

                          {/* Details action */}
                          <td className="px-8 py-5.5">
                            <button
                              onClick={() => setSelectedLog(log)}
                              className="p-2.5 bg-bg-secondary hover:bg-hover border border-border rounded-lg text-text-secondary hover:text-text-primary transition-all cursor-pointer"
                              title="Inspect Payload"
                            >
                              <Eye className="w-4.5 h-4.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Table Footer Pagination matching Second Image */}
              <div
                className="flex flex-col sm:flex-row justify-between items-center gap-4 px-8 py-5 text-xs text-text-muted font-semibold select-none border-t"
                style={{ backgroundColor: 'var(--color-bg-secondary)', borderColor: 'var(--color-divider)' }}
              >
                {/* Left sizing controls */}
                <div className="flex items-center gap-2">
                  <span>Show</span>
                  <select
                    value={pageSize}
                    onChange={(e) => {
                      setPageSize(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                    className="bg-bg-primary border border-border rounded-lg px-2.5 py-1 outline-none font-bold text-text-primary cursor-pointer shadow-sm"
                  >
                    <option value="10">10</option>
                    <option value="20">20</option>
                    <option value="50">50</option>
                    <option value="100">100</option>
                  </select>
                  <span>per page</span>
                </div>

                {/* Center page details */}
                <div className="text-[11px] font-bold text-text-muted">
                  Showing <span className="text-text-primary font-mono font-extrabold">{(currentPage - 1) * pageSize + 1}</span> to{' '}
                  <span className="text-text-primary font-mono font-extrabold">{Math.min(currentPage * pageSize, total)}</span> of{' '}
                  <span className="text-text-primary font-mono font-extrabold">{total}</span> items
                </div>

                {/* Right navigation numbers */}
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setCurrentPage(1)}
                    disabled={currentPage === 1}
                    className="p-1 hover:bg-bg-primary border border-transparent hover:border-border rounded disabled:opacity-40 disabled:hover:bg-transparent"
                  >
                    <ChevronsLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="p-1 hover:bg-bg-primary border border-transparent hover:border-border rounded disabled:opacity-40 disabled:hover:bg-transparent"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>

                  {/* Dynamic page numbers */}
                  {(() => {
                    const pages = [];
                    pages.push(1);

                    if (currentPage > 3) {
                      pages.push(-1); // represent ellipsis
                    }

                    for (let p = Math.max(2, currentPage - 1); p <= Math.min(totalPages - 1, currentPage + 1); p++) {
                      if (!pages.includes(p)) {
                        pages.push(p);
                      }
                    }

                    if (currentPage < totalPages - 2) {
                      pages.push(-1);
                    }

                    if (totalPages > 1 && !pages.includes(totalPages)) {
                      pages.push(totalPages);
                    }

                    return pages.map((p, idx) => {
                      if (p === -1) {
                        return (
                          <span key={`ellipsis-${idx}`} className="px-1 text-text-muted">
                            ...
                          </span>
                        );
                      }
                      const isCurrent = p === currentPage;
                      return (
                        <button
                          key={p}
                          onClick={() => setCurrentPage(p)}
                          className={`w-7 h-7 rounded text-[11px] font-bold transition-all border ${
                            isCurrent
                              ? 'bg-accent border-accent text-white shadow-sm'
                              : 'hover:bg-bg-primary border-transparent text-text-secondary'
                          }`}
                        >
                          {p}
                        </button>
                      );
                    });
                  })()}

                  <button
                    onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages || totalPages === 0}
                    className="p-1 hover:bg-bg-primary border border-transparent hover:border-border rounded disabled:opacity-40 disabled:hover:bg-transparent"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setCurrentPage(totalPages)}
                    disabled={currentPage === totalPages || totalPages === 0}
                    className="p-1 hover:bg-bg-primary border border-transparent hover:border-border rounded disabled:opacity-40 disabled:hover:bg-transparent"
                  >
                    <ChevronsRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </Card>

        {/* Detailed Modal/Drawer overlay */}
        {selectedLog && (
          <div className="fixed inset-0 z-50 flex items-center justify-end bg-slate-900/40 backdrop-blur-xs select-none">
            {/* Click outside target */}
            <div className="absolute inset-0" onClick={() => setSelectedLog(null)} />
            
            {/* Sidebar drawer content */}
            <div className="relative w-full max-w-lg h-screen bg-bg-card border-l border-border shadow-2xl flex flex-col z-10 animate-slide-in select-all">
              {/* Header */}
              <div className="h-16 flex items-center justify-between px-6 border-b border-border">
                <div className="flex items-center gap-2">
                  <FileCode className="w-4 h-4 text-accent" />
                  <h3 className="text-sm font-extrabold text-text-primary">Inspect Audit Payload</h3>
                </div>
                <button
                  onClick={() => setSelectedLog(null)}
                  className="p-1 hover:bg-hover rounded-lg text-text-muted hover:text-text-primary transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Body */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6 text-left">
                {/* General Info */}
                <div className="space-y-4">
                  <div>
                    <h4 className="text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1">Audit Record ID</h4>
                    <p className="text-xs font-mono font-bold text-text-primary">{selectedLog.id}</p>
                  </div>
                  <div>
                    <h4 className="text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1">Actor</h4>
                    <p className="text-xs font-bold text-text-primary">{selectedLog.userFullName}</p>
                    <p className="text-[10px] text-text-muted font-mono">{selectedLog.userEmail}</p>
                  </div>
                  <div>
                    <h4 className="text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1">Action Type</h4>
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase font-mono border"
                      style={{
                        background: getActionBadgeColor(selectedLog.action).bg,
                        color: getActionBadgeColor(selectedLog.action).text,
                        borderColor: getActionBadgeColor(selectedLog.action).border
                      }}
                    >
                      {getActionLabel(selectedLog.action)}
                    </span>
                  </div>
                </div>

                {/* Findings List */}
                {selectedLog.findingIds && selectedLog.findingIds.length > 0 && (
                  <div>
                    <h4 className="text-[10px] font-bold text-text-muted uppercase tracking-wider mb-2">Affected Resource Keys</h4>
                    <div className="max-h-28 overflow-y-auto border border-border rounded-xl p-3 bg-bg-secondary font-mono text-[9px] text-text-secondary leading-relaxed space-y-1">
                      {selectedLog.findingIds.map((fId, idx) => (
                        <div key={idx} className="flex justify-between hover:text-text-primary">
                          <span>{fId}</span>
                          <span className="text-[8px] text-text-muted">#{idx + 1}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Metadata JSON display */}
                <div>
                  <h4 className="text-[10px] font-bold text-text-muted uppercase tracking-wider mb-2 font-mono">Payload Metadata (JSON)</h4>
                  <pre
                    className="border border-border rounded-xl p-4 overflow-x-auto text-[10px] font-mono leading-relaxed bg-[#1A1816] text-[#F3EFE9]"
                    style={{ maxHeight: '350px' }}
                  >
                    {JSON.stringify(selectedLog.actionMetadata, null, 2)}
                  </pre>
                </div>
              </div>

              {/* Footer */}
              <div className="p-4 border-t border-border bg-bg-secondary flex justify-end">
                <button
                  onClick={() => setSelectedLog(null)}
                  className="px-4 py-2 bg-bg-card hover:bg-hover border border-border text-text-secondary hover:text-text-primary text-xs font-bold rounded-xl cursor-pointer shadow-sm transition-all"
                >
                  Close payload inspector
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </DashboardLayout>
  );
}
