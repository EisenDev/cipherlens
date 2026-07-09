import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { useUIStore } from '../store/useUIStore';
import DashboardLayout from '../components/DashboardLayout';
import { apiRequest } from '../api/client';
import { 
  ShieldAlert, 
  ShieldCheck, 
  ShieldX, 
  Sparkles, 
  Info, 
  Search, 
  X, 
  ChevronDown, 
  ChevronRight,
  Calendar,
  AlertTriangle,
  ArrowUpDown,
  BookOpen,
  ClipboardList,
  SlidersHorizontal,
  ChevronLeft,
  ChevronsLeft,
  ChevronsRight,
  MoreHorizontal
} from 'lucide-react';

interface Asset {
  id: string;
  name: string;
  url: string;
  type: string;
}

interface Finding {
  id: string;
  findingCode: string;
  title: string;
  severity: string;
  module: string;
  category: string;
  scanner: string;
  cvss: string;
  status: string;
  assignedTo: string;
  firstSeen: string;
  lastSeen: string;
  occurrences: number;
  cve: string;
  cwe: string;
  mitreAttack: string;
  owaspMapping: string;
  description: string;
  remediation: string;
  evidence: string;
  notes: string;
  asset: Asset;
}

interface Stats {
  totalActive: number;
  criticalActive: number;
  highActive: number;
  mediumActive: number;
  lowActive: number;
  infoActive: number;
  resolvedThisWeek: number;
  avgHoursToResolution: number;
  assetsWithActive: number;
}

export default function FindingsPage() {
  const { openLoginModal } = useUIStore();
  const { accessToken: authAccessToken } = useAuthStore();
  const navigate = useNavigate();

  // Redirect to home if not logged in
  useEffect(() => {
    if (!authAccessToken) {
      openLoginModal();
      navigate('/');
    }
  }, [authAccessToken, navigate, openLoginModal]);

  // Table & Filters State
  const [findings, setFindings] = useState<Finding[]>([]);
  const [stats, setStats] = useState<Stats>({
    totalActive: 0,
    criticalActive: 0,
    highActive: 0,
    mediumActive: 0,
    lowActive: 0,
    infoActive: 0,
    resolvedThisWeek: 0,
    avgHoursToResolution: 0,
    assetsWithActive: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [tableSearch, setTableSearch] = useState('');
  const [selectedSeverities, setSelectedSeverities] = useState<string[]>([]);
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [selectedAssetId, setSelectedAssetId] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedScanner, setSelectedScanner] = useState('');
  const [selectedAssignedTo, setSelectedAssignedTo] = useState('');
  const [cvssMin, setCvssMin] = useState<string>('');
  const [cvssMax, setCvssMax] = useState<string>('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [showMoreFilters, setShowMoreFilters] = useState(false);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // Selection state
  const [selectedFindingKeys, setSelectedFindingKeys] = useState<{ findingCode: string; assetId: string }[]>([]);

  // Sorting
  const [sortField, setSortField] = useState<'severity' | 'title' | 'cvss' | 'lastSeen' | 'occurrences'>('lastSeen');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Drawer detail state
  const [drawerFinding, setDrawerFinding] = useState<Finding | null>(null);
  const [drawerNotes, setDrawerNotes] = useState('');
  const [notesSaving, setNotesSaving] = useState(false);

  // AI Assistant State
  const [aiMode, setAiMode] = useState<'explain' | 'cve' | 'checklist' | 'priority' | null>(null);
  const [aiResponse, setAiResponse] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const fetchFindings = () => {
    if (!authAccessToken) return;
    setLoading(true);

    const params = new URLSearchParams();
    
    // Combine search and tableSearch
    const combinedSearch = search || tableSearch;
    if (combinedSearch) params.append('search', combinedSearch);
    
    if (selectedSeverities.length > 0) params.append('severities', selectedSeverities.join(','));
    if (selectedStatuses.length > 0) params.append('statuses', selectedStatuses.join(','));
    if (selectedAssetId) params.append('asset_id', selectedAssetId);
    if (selectedCategory) params.append('category', selectedCategory);
    if (selectedScanner) params.append('scanner', selectedScanner);
    if (selectedAssignedTo) params.append('assigned_to', selectedAssignedTo);
    if (cvssMin) params.append('cvss_min', cvssMin);
    if (cvssMax) params.append('cvss_max', cvssMax);
    if (dateFrom) params.append('date_from', dateFrom);
    if (dateTo) params.append('date_to', dateTo);

    apiRequest(`/api/findings?${params.toString()}`)
      .then((res) => {
        setFindings(res.findings);
        setStats(res.stats);
        setError(null);
      })
      .catch((err) => {
        setError(err.message || 'Failed to fetch findings');
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchFindings();
    setCurrentPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    authAccessToken,
    selectedSeverities,
    selectedStatuses,
    selectedAssetId,
    selectedCategory,
    selectedScanner,
    selectedAssignedTo,
    cvssMin,
    cvssMax,
    dateFrom,
    dateTo
  ]);

  // Debounced search trigger
  useEffect(() => {
    const handler = setTimeout(() => {
      fetchFindings();
      setCurrentPage(1);
    }, 400);
    return () => clearTimeout(handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, tableSearch]);

  // Sort logic
  const handleSort = (field: 'severity' | 'title' | 'cvss' | 'lastSeen' | 'occurrences') => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const getSortedFindings = () => {
    const severityWeight: Record<string, number> = {
      CRITICAL: 5,
      HIGH: 4,
      MEDIUM: 3,
      LOW: 2,
      INFO: 1
    };

    return [...findings].sort((a, b) => {
      let comparison = 0;
      if (sortField === 'severity') {
        const wA = severityWeight[a.severity.toUpperCase()] || 0;
        const wB = severityWeight[b.severity.toUpperCase()] || 0;
        comparison = wA - wB;
      } else if (sortField === 'cvss') {
        const vA = a.cvss === '--' ? -1 : parseFloat(a.cvss);
        const vB = b.cvss === '--' ? -1 : parseFloat(b.cvss);
        comparison = vA - vB;
      } else if (sortField === 'occurrences') {
        comparison = a.occurrences - b.occurrences;
      } else if (sortField === 'lastSeen') {
        comparison = new Date(a.lastSeen).getTime() - new Date(b.lastSeen).getTime();
      } else {
        comparison = a[sortField].localeCompare(b[sortField]);
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });
  };

  // Status Change handler
  const handleStatusChange = async (findingCode: string, assetId: string, newStatus: string) => {
    try {
      await apiRequest('/api/findings/status', {
        method: 'PATCH',
        body: JSON.stringify({ findingCode, assetId, status: newStatus })
      });
      fetchFindings();
      if (drawerFinding && drawerFinding.findingCode === findingCode && drawerFinding.asset.id === assetId) {
        setDrawerFinding({ ...drawerFinding, status: newStatus });
      }
    } catch (err: any) {
      alert(err.message || 'Failed to update status');
    }
  };

  // Assignee Change handler
  const handleAssigneeChange = async (findingCode: string, assetId: string, assignee: string) => {
    try {
      await apiRequest('/api/findings/status', {
        method: 'PATCH',
        body: JSON.stringify({ findingCode, assetId, assignedTo: assignee })
      });
      fetchFindings();
      if (drawerFinding && drawerFinding.findingCode === findingCode && drawerFinding.asset.id === assetId) {
        setDrawerFinding({ ...drawerFinding, assignedTo: assignee });
      }
    } catch (err: any) {
      alert(err.message || 'Failed to update assignee');
    }
  };

  // Bulk Actions
  const handleBulkAction = async (actionType: 'status' | 'assign' | 'delete' | 'validate', value?: string) => {
    if (selectedFindingKeys.length === 0) return;
    try {
      let body: any = { findingKeys: selectedFindingKeys };
      if (actionType === 'status') {
        body.status = value;
      } else if (actionType === 'assign') {
        body.assignedTo = value;
      } else if (actionType === 'validate') {
        body.reRunValidation = true;
      }

      const res = await apiRequest('/api/findings/bulk', {
        method: 'POST',
        body: JSON.stringify(body)
      });
      setSelectedFindingKeys([]);
      fetchFindings();
      alert(res.message || 'Bulk action applied successfully.');
    } catch (err: any) {
      alert(err.message || 'Failed to execute bulk action');
    }
  };

  // Notes save
  const handleSaveNotes = async () => {
    if (!drawerFinding) return;
    setNotesSaving(true);
    try {
      await apiRequest('/api/findings/status', {
        method: 'PATCH',
        body: JSON.stringify({ 
          findingCode: drawerFinding.findingCode, 
          assetId: drawerFinding.asset.id, 
          notes: drawerNotes 
        })
      });
      setDrawerFinding({ ...drawerFinding, notes: drawerNotes });
      fetchFindings();
    } catch (err: any) {
      alert(err.message || 'Failed to save notes');
    } finally {
      setNotesSaving(false);
    }
  };

  // AI Assistant trigger
  const handleAIAssistance = async (mode: 'explain' | 'cve' | 'checklist' | 'priority') => {
    if (!drawerFinding) return;
    setAiMode(mode);
    setAiLoading(true);
    setAiResponse(null);
    try {
      const res = await apiRequest('/api/findings/ai-assistance', {
        method: 'POST',
        body: JSON.stringify({ 
          findingCode: drawerFinding.findingCode, 
          assetId: drawerFinding.asset.id,
          mode 
        })
      });
      setAiResponse(res.response);
    } catch (err: any) {
      setAiResponse(`Failed to call AI findings assistant: ${err.message || 'API Timeout'}`);
    } finally {
      setAiLoading(false);
    }
  };

  // Reset Filters
  const handleResetFilters = () => {
    setSearch('');
    setTableSearch('');
    setSelectedSeverities([]);
    setSelectedStatuses([]);
    setSelectedAssetId('');
    setSelectedCategory('');
    setSelectedScanner('');
    setSelectedAssignedTo('');
    setCvssMin('');
    setCvssMax('');
    setDateFrom('');
    setDateTo('');
  };

  // Checkbox handlers
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allKeys = paginatedFindings.map(f => ({ findingCode: f.findingCode, assetId: f.asset.id }));
      setSelectedFindingKeys(allKeys);
    } else {
      setSelectedFindingKeys([]);
    }
  };

  const handleSelectOne = (checked: boolean, findingCode: string, assetId: string) => {
    if (checked) {
      setSelectedFindingKeys([...selectedFindingKeys, { findingCode, assetId }]);
    } else {
      setSelectedFindingKeys(selectedFindingKeys.filter(k => !(k.findingCode === findingCode && k.assetId === assetId)));
    }
  };

  // Helpers for styling
  const getSeverityStyle = (severity: string) => {
    const sev = severity.toUpperCase();
    if (sev === 'CRITICAL') return 'bg-red-50 text-red-700 border-red-200';
    if (sev === 'HIGH') return 'bg-orange-50 text-orange-700 border-orange-200';
    if (sev === 'MEDIUM') return 'bg-amber-50 text-amber-700 border-amber-200';
    if (sev === 'LOW') return 'bg-blue-50 text-blue-700 border-blue-200';
    return 'bg-slate-50 text-slate-700 border-slate-200';
  };

  const getSeverityIcon = (severity: string) => {
    const sev = severity.toUpperCase();
    if (sev === 'CRITICAL') return <ShieldX className="w-4 h-4 text-red-600" />;
    if (sev === 'HIGH') return <ShieldAlert className="w-4 h-4 text-orange-500" />;
    if (sev === 'MEDIUM') return <ShieldAlert className="w-4 h-4 text-amber-500" />;
    if (sev === 'LOW') return <ShieldCheck className="w-4 h-4 text-blue-500" />;
    return <Info className="w-4 h-4 text-slate-400" />;
  };

  const getStatusBadgeStyle = (status: string) => {
    if (status === 'Open') return 'bg-slate-50 text-slate-700 border-slate-200';
    if (status === 'Investigating') return 'bg-blue-50 text-blue-700 border-blue-200';
    if (status === 'In Progress') return 'bg-indigo-50 text-indigo-700 border-indigo-200';
    if (status === 'Resolved' || status === 'Fixed' || status === 'Mitigated') return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    if (status === 'Accepted Risk') return 'bg-amber-50 text-amber-700 border-amber-200';
    if (status === 'False Positive') return 'bg-slate-50 text-slate-500 border-slate-200';
    return 'bg-slate-50 text-slate-700 border-slate-200';
  };

  /** Maps a raw scanner tool key + category into a clean display name */
  const getScannerDisplayName = (scanner: string, category: string, module: string): string => {
    const s = (scanner || '').toLowerCase();
    const c = (category || '').toLowerCase();
    const m = (module || '').toLowerCase();
    if (s === 'headers' || c.includes('header') || m.includes('header')) return 'Security Headers';
    if (s === 'ssl' || s === 'tls' || c.includes('tls') || c.includes('ssl') || m.includes('ssl')) return 'SSL/TLS Analysis';
    if (s === 'ports' || c.includes('port') || m.includes('port')) return 'Port Analysis';
    if (s === 'subdomains' || c.includes('subdomain') || m.includes('subdomain')) return 'Subdomain Enumeration';
    if (s === 'dns' || c.includes('dns') || c.includes('email') || m.includes('dns')) return 'DNS / Email Security';
    if (s === 'technology' || c.includes('technology') || m.includes('tech')) return 'Technology Fingerprint';
    if (s === 'crawler' || c.includes('crawl') || m.includes('crawl')) return 'Crawl Analysis';
    if (s === 'cookies' || c.includes('cookie') || m.includes('cookie')) return 'Cookie Analysis';
    if (c.includes('security misconfiguration') || c.includes('misconfiguration')) return 'Security Misconfiguration';
    if (c.includes('information') || c.includes('disclosure')) return 'Information Disclosure';
    if (c.includes('network')) return 'Network Exposure';
    if (category) return category;
    if (scanner) return scanner.charAt(0).toUpperCase() + scanner.slice(1);
    return 'Security Analysis';
  };

  /** Renders markdown-like text with **bold**, *italic*, ### headings, * bullets into JSX */
  const renderMarkdown = (text: string): React.ReactNode => {
    if (!text) return null;
    const lines = text.split('\n');
    return lines.map((line, idx) => {
      // H3 heading
      if (line.startsWith('### ')) {
        return <p key={idx} className="font-extrabold text-slate-900 mt-3 mb-1 text-body-sm">{line.replace(/^### /, '')}</p>;
      }
      // H2 heading
      if (line.startsWith('## ')) {
        return <p key={idx} className="font-extrabold text-slate-900 mt-3 mb-1">{line.replace(/^## /, '')}</p>;
      }
      // Bullet point
      if (line.startsWith('* ') || line.startsWith('- ')) {
        const content = line.replace(/^[*-] /, '');
        return (
          <div key={idx} className="flex gap-2 ml-2">
            <span className="text-slate-400 mt-0.5 flex-shrink-0">•</span>
            <span>{renderInlineMarkdown(content)}</span>
          </div>
        );
      }
      // Empty line
      if (line.trim() === '') return <div key={idx} className="h-2" />;
      // Regular paragraph
      return <p key={idx} className="leading-relaxed">{renderInlineMarkdown(line)}</p>;
    });
  };

  const renderInlineMarkdown = (text: string): React.ReactNode => {
    // Replace **bold** and *italic* with spans
    const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i} className="font-extrabold text-slate-900">{part.slice(2, -2)}</strong>;
      }
      if (part.startsWith('*') && part.endsWith('*') && !part.startsWith('**')) {
        return <em key={i} className="italic text-slate-700">{part.slice(1, -1)}</em>;
      }
      return part;
    });
  };

  // Mock IP mapping for beautiful presentation
  const getMockIP = (url: string) => {
    if (url.includes('atelier')) return '172.27.27.100';
    if (url.includes('sqauto')) return '104.244.42.1';
    if (url.includes('youtube')) return '142.250.190.46';
    if (url.includes('example')) return '93.184.216.34';
    return '172.27.27.200';
  };

  const formatDate = (isoStr: string) => {
    const date = new Date(isoStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) + ' ' + date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  // Split date into human-readable table presentation
  const formatTableDate = (isoStr: string) => {
    const date = new Date(isoStr);
    const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const timeStr = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    return { dateStr, timeStr };
  };

  // Paginate findings
  const sortedFindings = getSortedFindings();
  const totalFindings = sortedFindings.length;
  const totalPages = Math.ceil(totalFindings / pageSize) || 1;
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedFindings = sortedFindings.slice(startIndex, startIndex + pageSize);

  return (
    <DashboardLayout activePage="findings">
      <div className="py-8 px-10 space-y-7 w-full">
        
        {/* Main Title Row */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-light text-text-primary tracking-tight" style={{ fontFamily: 'var(--font-heading)' }}>
              All Findings
            </h1>
            <p className="text-xs text-text-muted mt-1.5" style={{ fontFamily: 'var(--font-body)' }}>
              View, filter and manage all security findings from your scans.
            </p>
          </div>
          
          <div className="flex gap-3">
            <div className="relative group">
              <button 
                className="px-4 py-2 border border-border-warm bg-white hover:bg-bg-primary text-xs font-bold text-text-primary rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
                style={{ fontFamily: 'var(--font-body)' }}
              >
                Export <ChevronDown className="w-3.5 h-3.5" />
              </button>
              <div className="absolute right-0 mt-2 w-40 bg-white border border-border-warm rounded-2xl shadow-lg py-1.5 hidden group-hover:block z-50 text-left">
                <button onClick={() => alert('PDF report export scheduled for Phase 3.2')} className="w-full px-4 py-2 text-xs font-semibold text-text-primary hover:bg-bg-secondary">PDF Summary</button>
                <button onClick={() => alert('CSV data export scheduled for Phase 3.2')} className="w-full px-4 py-2 text-xs font-semibold text-text-primary hover:bg-bg-secondary">CSV Export</button>
              </div>
            </div>

            <div className="relative group">
              <button 
                className="px-4 py-2 border border-border-warm bg-white hover:bg-bg-primary text-xs font-bold text-text-primary rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
                style={{ fontFamily: 'var(--font-body)' }}
              >
                Bulk Actions <ChevronDown className="w-3.5 h-3.5" />
              </button>
              <div className="absolute right-0 mt-2 w-48 bg-white border border-border-warm rounded-2xl shadow-lg py-2 hidden group-hover:block z-50 text-left">
                <button 
                  onClick={() => handleBulkAction('status', 'Investigating')}
                  disabled={selectedFindingKeys.length === 0}
                  className="w-full px-4 py-2 text-xs font-semibold text-text-primary hover:bg-bg-secondary disabled:opacity-50"
                >
                  Set: Investigating
                </button>
                <button 
                  onClick={() => handleBulkAction('status', 'Accepted Risk')}
                  disabled={selectedFindingKeys.length === 0}
                  className="w-full px-4 py-2 text-xs font-semibold text-text-primary hover:bg-bg-secondary disabled:opacity-50"
                >
                  Set: Accepted Risk
                </button>
                <button 
                  onClick={() => handleBulkAction('status', 'Resolved')}
                  disabled={selectedFindingKeys.length === 0}
                  className="w-full px-4 py-2 text-xs font-semibold text-text-primary hover:bg-bg-secondary disabled:opacity-50"
                >
                  Set: Fixed/Resolved
                </button>
                <hr className="my-1 border-border-warm" />
                <button 
                  onClick={() => handleBulkAction('assign', 'Arjay Escabas')}
                  disabled={selectedFindingKeys.length === 0}
                  className="w-full px-4 py-2 text-xs font-semibold text-text-primary hover:bg-bg-secondary disabled:opacity-50"
                >
                  Assign to Me
                </button>
                <button 
                  onClick={() => handleBulkAction('validate')}
                  disabled={selectedFindingKeys.length === 0}
                  className="w-full px-4 py-2 text-xs font-bold text-emerald-700 hover:bg-bg-secondary disabled:opacity-50"
                >
                  Re-run Validation
                </button>
              </div>
            </div>

            <button
              onClick={() => alert('Jira / Slack integration scheduled for Phase 3.2')}
              className="px-4 py-2 bg-accent hover:bg-accent-dark text-xs font-bold text-white rounded-xl flex items-center gap-1.5 transition-colors shadow-sm cursor-pointer"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              Create Ticket
            </button>
          </div>
        </div>

        {/* Statistics summary row matching image precisely */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
          
          {/* Critical Findings */}
          <div className="card bg-white p-5 rounded-2xl border border-border-warm flex items-start justify-between shadow-sm relative overflow-hidden text-left">
            <div className="space-y-3">
              <p className="text-body-sm font-bold text-text-muted uppercase tracking-wider">Critical</p>
              <div className="flex items-baseline gap-2">
                <p className="text-3xl font-extrabold text-red-600 font-mono">{loading ? '--' : stats.criticalActive}</p>
              </div>
              <p className="text-[10px] text-red-500 font-semibold flex items-center gap-0.5">
                <span>↓</span> 1 from last scan
              </p>
            </div>
            <div className="w-10 h-10 rounded-full bg-red-50 text-red-600 flex items-center justify-center border border-red-100 flex-shrink-0">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
          </div>

          {/* High Findings */}
          <div className="card bg-white p-5 rounded-2xl border border-border-warm flex items-start justify-between shadow-sm relative overflow-hidden text-left">
            <div className="space-y-3">
              <p className="text-body-sm font-bold text-text-muted uppercase tracking-wider">High</p>
              <div className="flex items-baseline gap-2">
                <p className="text-3xl font-extrabold text-orange-600 font-mono">{loading ? '--' : stats.highActive}</p>
              </div>
              <p className="text-[10px] text-orange-500 font-semibold flex items-center gap-0.5">
                <span>↑</span> 2 from last scan
              </p>
            </div>
            <div className="w-10 h-10 rounded-full bg-orange-50 text-orange-600 flex items-center justify-center border border-orange-100 flex-shrink-0">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
          </div>

          {/* Medium Findings */}
          <div className="card bg-white p-5 rounded-2xl border border-border-warm flex items-start justify-between shadow-sm relative overflow-hidden text-left">
            <div className="space-y-3">
              <p className="text-body-sm font-bold text-text-muted uppercase tracking-wider">Medium</p>
              <div className="flex items-baseline gap-2">
                <p className="text-3xl font-extrabold text-amber-600 font-mono">{loading ? '--' : stats.mediumActive}</p>
              </div>
              <p className="text-[10px] text-amber-600 font-semibold flex items-center gap-0.5">
                <span>↓</span> 1 from last scan
              </p>
            </div>
            <div className="w-10 h-10 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-100 flex-shrink-0">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
          </div>

          {/* Low Findings */}
          <div className="card bg-white p-5 rounded-2xl border border-border-warm flex items-start justify-between shadow-sm relative overflow-hidden text-left">
            <div className="space-y-3">
              <p className="text-body-sm font-bold text-text-muted uppercase tracking-wider">Low</p>
              <div className="flex items-baseline gap-2">
                <p className="text-3xl font-extrabold text-blue-600 font-mono">{loading ? '--' : stats.lowActive}</p>
              </div>
              <p className="text-[10px] text-text-muted font-semibold">No change</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100 flex-shrink-0">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
          </div>

          {/* Informational Findings */}
          <div className="card bg-white p-5 rounded-2xl border border-border-warm flex items-start justify-between shadow-sm relative overflow-hidden text-left">
            <div className="space-y-3">
              <p className="text-body-sm font-bold text-text-muted uppercase tracking-wider">Informational</p>
              <div className="flex items-baseline gap-2">
                <p className="text-3xl font-extrabold text-slate-600 font-mono">{loading ? '--' : stats.infoActive}</p>
              </div>
              <p className="text-[10px] text-emerald-600 font-semibold flex items-center gap-0.5">
                <span>↑</span> 1 from last scan
              </p>
            </div>
            <div className="w-10 h-10 rounded-full bg-slate-50 text-slate-600 flex items-center justify-center border border-slate-100 flex-shrink-0">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>

          {/* Total active findings */}
          <div className="card bg-white p-5 rounded-2xl border border-border-warm flex items-start justify-between shadow-sm relative overflow-hidden text-left">
            <div className="space-y-3">
              <p className="text-body-sm font-bold text-text-muted uppercase tracking-wider">Total Findings</p>
              <div className="flex items-baseline gap-2">
                <p className="text-3xl font-extrabold text-purple-700 font-mono">{loading ? '--' : stats.totalActive}</p>
              </div>
              <p className="text-[10px] text-emerald-650 font-semibold flex items-center gap-0.5">
                <span>↑</span> 1 from last scan
              </p>
            </div>
            <div className="w-10 h-10 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center border border-purple-100 flex-shrink-0">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
          </div>

        </div>

        {/* Split Layout: Advanced Filters Card Width and Height constrained */}
        <div className="grid grid-cols-12 gap-5 items-start">
          
          {/* Left Advanced Filters Panel (col-span-2) -> Narrower panel */}
          <div className="col-span-12 lg:col-span-2 flex flex-col gap-4">
            <div className="bg-white rounded-2xl border border-border-warm p-4 shadow-sm text-left flex flex-col gap-4 text-xs font-semibold">
              <div className="flex justify-between items-center border-b border-border-warm pb-2">
                <span className="font-extrabold text-text-primary text-body-sm flex items-center gap-1.5">
                  <SlidersHorizontal className="w-3.5 h-3.5 text-text-muted" /> Filters
                </span>
                <button 
                  onClick={handleResetFilters}
                  className="text-[10px] font-bold text-text-muted hover:text-slate-900 transition-colors cursor-pointer uppercase tracking-wider"
                >
                  Reset
                </button>
              </div>

              {/* Search filter input */}
              <div>
                <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider block mb-1">Search</label>
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-muted" />
                  <input 
                    type="text"
                    placeholder="Search findings..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full bg-bg-secondary border border-border-warm rounded-xl pl-8 pr-2.5 py-1.5 text-xs font-semibold text-text-primary outline-none focus:bg-white"
                  />
                </div>
              </div>

              {/* Severity Checkbox list with counts */}
              <div>
                <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider block mb-1.5">Severity</label>
                <div className="flex flex-col gap-1">
                  {[
                    { key: 'CRITICAL', label: 'Critical', color: 'bg-red-500', count: stats.criticalActive },
                    { key: 'HIGH', label: 'High', color: 'bg-orange-500', count: stats.highActive },
                    { key: 'MEDIUM', label: 'Medium', color: 'bg-amber-500', count: stats.mediumActive },
                    { key: 'LOW', label: 'Low', color: 'bg-blue-500', count: stats.lowActive },
                    { key: 'INFO', label: 'Informational', color: 'bg-slate-400', count: stats.infoActive }
                  ].map(item => (
                    <label key={item.key} className="flex items-center justify-between text-xs text-text-primary font-semibold select-none cursor-pointer hover:bg-bg-secondary/40 py-0.5 rounded px-1">
                      <div className="flex items-center gap-2">
                        <input 
                          type="checkbox"
                          checked={selectedSeverities.includes(item.key)}
                          onChange={(e) => {
                            if (e.target.checked) setSelectedSeverities([...selectedSeverities, item.key]);
                            else setSelectedSeverities(selectedSeverities.filter(s => s !== item.key));
                          }}
                          className="rounded border-border-warm text-slate-900 focus:ring-slate-500 w-3.5 h-3.5"
                        />
                        <span className={`w-2 h-2 rounded-full ${item.color}`} />
                        <span>{item.label}</span>
                      </div>
                      <span className="text-[10px] text-text-muted bg-slate-100 px-1.5 py-0.5 rounded-full font-mono">{item.count}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Status Select dropdown */}
              <div>
                <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider block mb-1">Status</label>
                <select 
                  value={selectedStatuses.join(',')}
                  onChange={(e) => setSelectedStatuses(e.target.value ? [e.target.value] : [])}
                  className="w-full bg-bg-secondary border border-border-warm rounded-xl px-2.5 py-1.5 text-xs font-semibold text-text-primary outline-none focus:bg-white"
                >
                  <option value="">Select status</option>
                  <option value="Open">Open</option>
                  <option value="Investigating">Investigating</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Accepted Risk">Accepted Risk</option>
                  <option value="Resolved">Resolved</option>
                  <option value="Mitigated">Mitigated</option>
                  <option value="Fixed">Fixed</option>
                  <option value="False Positive">False Positive</option>
                </select>
              </div>

              {/* Category dropdown */}
              <div>
                <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider block mb-1">Category</label>
                <select 
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full bg-bg-secondary border border-border-warm rounded-xl px-2.5 py-1.5 text-xs font-semibold text-text-primary outline-none focus:bg-white"
                >
                  <option value="">Select category</option>
                  <option value="Security Headers">Security Headers</option>
                  <option value="Protocol">Protocol / TLS</option>
                  <option value="Subdomains">Subdomains</option>
                  <option value="Cookies">Cookies</option>
                  <option value="Network Exposure">Network Exposure</option>
                </select>
              </div>

              {/* Scanner dropdown */}
              <div>
                <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider block mb-1">Scanner</label>
                <select 
                  value={selectedScanner}
                  onChange={(e) => setSelectedScanner(e.target.value)}
                  className="w-full bg-bg-secondary border border-border-warm rounded-xl px-2.5 py-1.5 text-xs font-semibold text-text-primary outline-none focus:bg-white"
                >
                  <option value="">Select scanner</option>
                  <option value="headers">Security Headers (Nuclei)</option>
                  <option value="ssl">SSL Audit (TestSSL)</option>
                  <option value="tls">TLS check</option>
                  <option value="ports">Port Scanner</option>
                  <option value="subdomains">Subfinder</option>
                  <option value="technology">Httpx Tech</option>
                </select>
              </div>

              {/* Asset URL search box */}
              <div>
                <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider block mb-1">Asset</label>
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-muted" />
                  <input 
                    type="text"
                    placeholder="Search assets..."
                    value={selectedAssetId}
                    onChange={(e) => setSelectedAssetId(e.target.value)}
                    className="w-full bg-bg-secondary border border-border-warm rounded-xl pl-8 pr-2.5 py-1.5 text-xs font-semibold text-text-primary outline-none focus:bg-white"
                  />
                </div>
              </div>

              {/* Discovered dates */}
              <div>
                <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider block mb-1">Discovered</label>
                <div className="grid grid-cols-2 gap-1 text-[10px]">
                  <input 
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="w-full bg-bg-secondary border border-border-warm rounded-lg px-1.5 py-1 text-center outline-none"
                  />
                  <input 
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="w-full bg-bg-secondary border border-border-warm rounded-lg px-1.5 py-1 text-center outline-none"
                  />
                </div>
              </div>

              {/* Collapsible More Filters */}
              <div className="border-t border-border-warm pt-2">
                <button 
                  onClick={() => setShowMoreFilters(!showMoreFilters)}
                  className="w-full flex justify-between items-center text-[10px] text-text-muted font-bold uppercase tracking-wider hover:text-slate-900 transition-colors cursor-pointer"
                >
                  <span>More Filters</span>
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showMoreFilters ? 'rotate-180' : ''}`} />
                </button>
                {showMoreFilters && (
                  <div className="flex flex-col gap-3 mt-2.5">
                    <div>
                      <label className="text-[9px] font-bold text-text-muted uppercase tracking-wider block mb-1">CVSS Range</label>
                      <div className="grid grid-cols-2 gap-1.5">
                        <input 
                          type="number"
                          step="0.1"
                          placeholder="Min"
                          value={cvssMin}
                          onChange={(e) => setCvssMin(e.target.value)}
                          className="w-full bg-bg-secondary border border-border-warm rounded-lg py-1 text-center text-xs"
                        />
                        <input 
                          type="number"
                          step="0.1"
                          placeholder="Max"
                          value={cvssMax}
                          onChange={(e) => setCvssMax(e.target.value)}
                          className="w-full bg-bg-secondary border border-border-warm rounded-lg py-1 text-center text-xs"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-[9px] font-bold text-text-muted uppercase tracking-wider block mb-1">Assigned To</label>
                      <select 
                        value={selectedAssignedTo}
                        onChange={(e) => setSelectedAssignedTo(e.target.value)}
                        className="w-full bg-bg-secondary border border-border-warm rounded-lg px-2 py-1 text-xs outline-none"
                      >
                        <option value="">All users</option>
                        <option value="Arjay Escabas">Arjay Escabas</option>
                        <option value="Unassigned">Unassigned</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>

            </div>
          </div>

          {/* Right Main Content Panel (col-span-10) */}
          <div className="col-span-12 lg:col-span-10 flex flex-col gap-4">
            
            {/* Table Header Action Bar (Above table) */}
            <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3 bg-white border border-border-warm rounded-2xl p-3 shadow-sm text-xs font-semibold text-text-primary">
              <div className="flex items-center gap-3">
                {selectedFindingKeys.length > 0 && (
                  <>
                    <span className="text-slate-800 font-bold">{selectedFindingKeys.length} selected</span>
                    <button 
                      onClick={() => setSelectedFindingKeys([])}
                      className="text-accent hover:underline font-bold"
                    >
                      Clear selection
                    </button>
                  </>
                )}
              </div>
              
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-muted" />
                  <input 
                    type="text"
                    placeholder="Search in table..."
                    value={tableSearch}
                    onChange={(e) => setTableSearch(e.target.value)}
                    className="bg-bg-secondary border border-border-warm rounded-xl pl-8 pr-3 py-1.5 text-xs font-semibold text-text-primary outline-none focus:bg-white w-44"
                  />
                </div>

                <button className="px-3 py-1.5 bg-white border border-border-warm rounded-xl text-xs hover:bg-bg-secondary transition-colors flex items-center gap-1 cursor-pointer">
                  Columns <ChevronDown className="w-3.5 h-3.5" />
                </button>
                <button 
                  onClick={() => handleSort('lastSeen')}
                  className="px-3 py-1.5 bg-white border border-border-warm rounded-xl text-xs hover:bg-bg-secondary transition-colors flex items-center gap-1 cursor-pointer"
                >
                  Newest First <ChevronDown className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Findings List Card Container - Constrained scrollable height */}
            <div className="bg-white rounded-2xl border border-border-warm shadow-sm overflow-hidden flex flex-col">
              
              <div className="overflow-x-auto max-h-[520px] overflow-y-auto">
                {loading ? (
                  <div className="py-20 flex flex-col items-center justify-center gap-3">
                    <div className="w-10 h-10 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
                    <p className="text-text-muted text-xs font-bold animate-pulse">Loading findings workspace...</p>
                  </div>
                ) : error ? (
                  <div className="py-16 text-center">
                    <AlertTriangle className="w-10 h-10 text-red-500 mx-auto mb-2" />
                    <p className="text-red-700 font-extrabold text-xs">{error}</p>
                  </div>
                ) : paginatedFindings.length === 0 ? (
                  <div className="py-20 text-center flex flex-col items-center justify-center gap-3">
                    <ShieldCheck className="w-12 h-12 text-emerald-500" />
                    <h3 className="font-extrabold text-text-primary text-body-lg">Clean Workspace!</h3>
                    <p className="text-text-muted text-xs max-w-md">No vulnerability findings match your filters. Your target environment is secure.</p>
                  </div>
                ) : (
                  <table className="w-full border-collapse text-left table-fixed">
                    <thead>
                      <tr className="bg-bg-secondary border-b border-border-warm text-[10px] font-extrabold uppercase tracking-wider text-text-muted select-none">
                        <th className="px-4 py-3.5 w-12 text-center">
                          <input 
                            type="checkbox"
                            checked={paginatedFindings.length > 0 && paginatedFindings.every(f => selectedFindingKeys.some(k => k.findingCode === f.findingCode && k.assetId === f.asset.id))}
                            onChange={(e) => handleSelectAll(e.target.checked)}
                            className="rounded border-border-warm text-slate-900 focus:ring-slate-500 cursor-pointer"
                          />
                        </th>
                        <th className="px-4 py-3.5 w-24 cursor-pointer hover:text-slate-950 transition-colors" onClick={() => handleSort('severity')}>
                          <span className="flex items-center gap-0.5">Severity <ArrowUpDown className="w-3 h-3 text-text-muted" /></span>
                        </th>
                        <th className="px-4 py-3.5 cursor-pointer hover:text-slate-950 transition-colors" onClick={() => handleSort('title')}>
                          <span className="flex items-center gap-0.5">Finding <ArrowUpDown className="w-3 h-3 text-text-muted" /></span>
                        </th>
                        <th className="px-4 py-3.5 w-44">Asset</th>
                        <th className="px-4 py-3.5 w-36">Scanner</th>
                        <th className="px-4 py-3.5 w-32">Category</th>
                        <th className="px-4 py-3.5 w-28 cursor-pointer hover:text-slate-950 transition-colors" onClick={() => handleSort('lastSeen')}>
                          <span className="flex items-center gap-0.5">Discovered <ArrowUpDown className="w-3 h-3 text-text-muted" /></span>
                        </th>
                        <th className="px-4 py-3.5 w-24">Status</th>
                        <th className="px-4 py-3.5 w-12 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border-warm text-xs font-semibold text-text-primary">
                      {paginatedFindings.map((f) => {
                        const isChecked = selectedFindingKeys.some(k => k.findingCode === f.findingCode && k.assetId === f.asset.id);
                        const { dateStr, timeStr } = formatTableDate(f.lastSeen);
                        return (
                          <tr 
                            key={`${f.findingCode}-${f.asset.id}`} 
                            className={`hover:bg-bg-secondary/40 transition-colors group cursor-pointer ${isChecked ? 'bg-bg-secondary/20' : ''}`}
                            onClick={() => { setDrawerFinding(f); setDrawerNotes(f.notes); setAiResponse(null); setAiMode(null); }}
                          >
                            <td className="px-4 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                              <input 
                                type="checkbox"
                                checked={isChecked}
                                onChange={(e) => handleSelectOne(e.target.checked, f.findingCode, f.asset.id)}
                                className="rounded border-border-warm text-slate-900 focus:ring-slate-500 cursor-pointer"
                              />
                            </td>
                            
                            <td className="px-4 py-3">
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-extrabold border uppercase select-none ${getSeverityStyle(f.severity)}`}>
                                {getSeverityIcon(f.severity)} {f.severity === 'INFO' ? 'Info' : f.severity.charAt(0) + f.severity.slice(1).toLowerCase()}
                              </span>
                            </td>

                            <td className="px-4 py-3">
                              <div className="flex flex-col pr-2">
                                <p className="font-extrabold text-slate-900 group-hover:text-slate-950 transition-colors text-xs leading-snug">{f.title}</p>
                                <p className="text-[10px] text-text-muted font-normal leading-normal mt-0.5 line-clamp-2 max-h-8 overflow-hidden">{f.description}</p>
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {f.cve && f.cve !== 'N/A' && (
                                    <span className="inline-block px-1 bg-slate-100 text-slate-600 rounded text-[9px] font-bold tracking-wider">{f.cve}</span>
                                  )}
                                  {f.cwe && f.cwe !== 'N/A' && (
                                    <span className="inline-block px-1 bg-slate-100 text-slate-600 rounded text-[9px] font-bold tracking-wider">{f.cwe}</span>
                                  )}
                                </div>
                              </div>
                            </td>

                            <td className="px-4 py-3">
                              <div>
                                <p className="font-bold text-slate-800 truncate">{f.asset.name}</p>
                                <p className="text-[10px] text-text-muted font-normal font-mono truncate">{getMockIP(f.asset.url)}</p>
                              </div>
                            </td>

                            <td className="px-4 py-3">
                              <p className="font-semibold text-slate-700 truncate text-xs">
                                {getScannerDisplayName(f.scanner, f.category, f.module)}
                              </p>
                            </td>

                            <td className="px-4 py-3 text-slate-600 font-semibold truncate">
                              {f.category || 'Vulnerability'}
                            </td>

                            <td className="px-4 py-3">
                              <div>
                                <p className="font-bold text-slate-700">{dateStr}</p>
                                <p className="text-[10px] text-text-muted font-normal mt-0.5">{timeStr}</p>
                              </div>
                            </td>

                            <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                              <div className="relative inline-block w-full">
                                <select 
                                  value={f.status}
                                  onChange={(e) => handleStatusChange(f.findingCode, f.asset.id, e.target.value)}
                                  className={`appearance-none w-full border font-bold text-[10px] rounded-lg px-2 py-1 pr-6 cursor-pointer outline-none transition-all shadow-sm ${getStatusBadgeStyle(f.status)}`}
                                >
                                  <option value="Open">Open</option>
                                  <option value="Investigating">Investigating</option>
                                  <option value="In Progress">In Progress</option>
                                  <option value="Resolved">Resolved</option>
                                  <option value="Mitigated">Mitigated</option>
                                  <option value="Fixed">Fixed</option>
                                  <option value="Accepted Risk">Accepted Risk</option>
                                  <option value="False Positive">False Positive</option>
                                </select>
                                <ChevronDown className="w-3.5 h-3.5 absolute right-1.5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
                              </div>
                            </td>

                            <td className="px-4 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                              <div className="relative group inline-block">
                                <button className="p-1 hover:bg-bg-secondary rounded-lg text-text-muted hover:text-slate-800 transition-colors">
                                  <MoreHorizontal className="w-4 h-4" />
                                </button>
                                <div className="absolute right-0 mt-1 w-44 bg-white border border-border-warm rounded-2xl shadow-lg py-2 hidden group-hover:block z-50 text-left">
                                  <button 
                                    onClick={() => handleAssigneeChange(f.findingCode, f.asset.id, 'Arjay Escabas')}
                                    className="w-full px-4 py-2 text-xs text-text-primary hover:bg-bg-secondary font-bold transition-colors"
                                  >
                                    Assign to Me
                                  </button>
                                  <button 
                                    onClick={() => { setDrawerFinding(f); setDrawerNotes(f.notes); setAiResponse(null); setAiMode(null); }}
                                    className="w-full px-4 py-2 text-xs text-text-primary hover:bg-bg-secondary font-bold transition-colors"
                                  >
                                    View Details
                                  </button>
                                </div>
                              </div>
                            </td>

                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>

              {/* Table Footer Pagination Controls matching Second Image */}
              {!loading && totalFindings > 0 && (
                <div className="flex flex-col sm:flex-row justify-between items-center gap-3 px-6 py-3.5 bg-bg-secondary border-t border-border-warm text-xs text-text-muted font-semibold select-none">
                  
                  {/* Left size controls */}
                  <div className="flex items-center gap-2">
                    <span>Show</span>
                    <select 
                      value={pageSize}
                      onChange={(e) => {
                        setPageSize(Number(e.target.value));
                        setCurrentPage(1);
                      }}
                      className="bg-white border border-border-warm rounded-lg px-2 py-1 outline-none font-bold text-text-primary cursor-pointer shadow-sm"
                    >
                      <option value="10">10</option>
                      <option value="20">20</option>
                      <option value="50">50</option>
                      <option value="100">100</option>
                    </select>
                    <span>per page</span>
                  </div>

                  {/* Center page numbers navigation */}
                  <div className="flex items-center gap-1">
                    <button 
                      onClick={() => setCurrentPage(1)}
                      disabled={currentPage === 1}
                      className="p-1 hover:bg-white hover:border border-border-warm rounded disabled:opacity-40 disabled:hover:bg-transparent"
                    >
                      <ChevronsLeft className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1}
                      className="p-1 hover:bg-white hover:border border-border-warm rounded disabled:opacity-40 disabled:hover:bg-transparent"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    
                    {(() => {
                      // Sliding window of 3 pages around current page
                      const windowSize = 3;
                      const half = Math.floor(windowSize / 2);
                      let startPage = Math.max(1, currentPage - half);
                      let endPage = Math.min(totalPages, startPage + windowSize - 1);
                      if (endPage - startPage < windowSize - 1) {
                        startPage = Math.max(1, endPage - windowSize + 1);
                      }
                      const pages = [];
                      for (let p = startPage; p <= endPage; p++) pages.push(p);
                      return pages.map(page => (
                        <button
                          key={page}
                          onClick={() => setCurrentPage(page)}
                          className={`w-6 h-6 rounded text-xs flex items-center justify-center transition-colors ${
                            currentPage === page
                              ? 'bg-slate-900 text-white font-bold'
                              : 'text-text-muted hover:bg-white border border-transparent hover:border-border-warm'
                          }`}
                        >
                          {page}
                        </button>
                      ));
                    })()}

                    <button 
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                      disabled={currentPage === totalPages}
                      className="p-1 hover:bg-white hover:border border-border-warm rounded disabled:opacity-40 disabled:hover:bg-transparent"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => setCurrentPage(totalPages)}
                      disabled={currentPage === totalPages}
                      className="p-1 hover:bg-white hover:border border-border-warm rounded disabled:opacity-40 disabled:hover:bg-transparent"
                    >
                      <ChevronsRight className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Right label page state info */}
                  <div>
                    Page {currentPage} of {totalPages}
                  </div>

                </div>
              )}

            </div>

          </div>

        </div>

      </div>

      {/* Slide-out detail Drawer (Right-side) */}
      {drawerFinding && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm z-50 flex justify-end transition-opacity duration-300">
          
          {/* Backdrop Click */}
          <div className="flex-1 cursor-pointer" onClick={() => setDrawerFinding(null)} />

          {/* Drawer Panel Container */}
          <div className="w-full max-w-[640px] bg-[#FAFAF7] h-screen shadow-2xl border-l border-border-warm flex flex-col relative text-left animate-slide-in overflow-y-auto">
            
            {/* Drawer Header */}
            <div className="p-6 bg-white border-b border-border-warm flex justify-between items-start">
              <div>
                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-body-xs font-extrabold border uppercase select-none mb-2 ${getSeverityStyle(drawerFinding.severity)}`}>
                  {getSeverityIcon(drawerFinding.severity)} {drawerFinding.severity === 'INFO' ? 'Info' : drawerFinding.severity} Severity
                </span>
                <h2 className="text-xl font-bold text-text-primary" style={{ fontFamily: 'var(--font-heading)' }}>
                  {drawerFinding.title}
                </h2>
                <p className="text-body-xs text-text-muted font-normal mt-1 leading-relaxed">
                  Vulnerability Code: <span className="font-mono bg-slate-100 px-1 py-0.5 rounded font-bold text-slate-800">{drawerFinding.findingCode}</span>
                </p>
              </div>
              <button 
                onClick={() => setDrawerFinding(null)}
                className="p-2 bg-bg-secondary hover:bg-slate-200 rounded-full text-text-muted hover:text-slate-800 transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Quick Action bar */}
            <div className="p-4 bg-white/50 border-b border-border-warm flex gap-4 px-6 items-center">
              <div className="flex-1">
                <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider block mb-1">Status</label>
                <select 
                  value={drawerFinding.status}
                  onChange={(e) => handleStatusChange(drawerFinding.findingCode, drawerFinding.asset.id, e.target.value)}
                  className={`w-full border font-bold text-body-sm rounded-xl px-2.5 py-1.5 outline-none transition-all shadow-sm ${getStatusBadgeStyle(drawerFinding.status)}`}
                >
                  <option value="Open">Open</option>
                  <option value="Investigating">Investigating</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Resolved">Resolved</option>
                  <option value="Mitigated">Mitigated</option>
                  <option value="Fixed">Fixed</option>
                  <option value="Accepted Risk">Accepted Risk</option>
                  <option value="False Positive">False Positive</option>
                </select>
              </div>
              <div className="flex-1">
                <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider block mb-1">Assignee</label>
                <select 
                  value={drawerFinding.assignedTo}
                  onChange={(e) => handleAssigneeChange(drawerFinding.findingCode, drawerFinding.asset.id, e.target.value)}
                  className="w-full bg-white border border-border-warm rounded-xl px-2.5 py-1.5 text-body-sm font-semibold text-text-primary outline-none"
                >
                  <option value="Unassigned">Unassigned</option>
                  <option value="Arjay Escabas">Arjay Escabas</option>
                  <option value="Security Admin">Security Admin</option>
                </select>
              </div>
            </div>

            {/* Content Body */}
            <div className="flex-1 p-6 flex flex-col gap-6 overflow-y-auto">

              {/* Affected Asset info */}
              <div className="bg-white p-4 rounded-2xl border border-border-warm shadow-sm">
                <h4 className="text-body-xs font-bold text-text-muted uppercase tracking-wider mb-2">Affected Asset Details</h4>
                <div className="flex flex-col gap-1.5 text-body-sm">
                  <div className="flex justify-between">
                    <span className="text-text-muted font-normal">Asset Target Name</span>
                    <span className="font-bold text-slate-800">{drawerFinding.asset.name}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-text-muted font-normal">URL Endpoint</span>
                    <span className="font-mono text-body-xs text-slate-600 truncate max-w-sm">{drawerFinding.asset.url}</span>
                  </div>
                  <div className="flex justify-between border-t border-border-warm pt-1.5 mt-1.5">
                    <span className="text-text-muted font-normal">First Seen</span>
                    <span className="font-bold text-slate-800 text-body-xs">{formatDate(drawerFinding.firstSeen)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-muted font-normal">Last Seen</span>
                    <span className="font-bold text-slate-800 text-body-xs">{formatDate(drawerFinding.lastSeen)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-muted font-normal">Discovered count</span>
                    <span className="font-extrabold text-slate-900 bg-slate-100 px-2 py-0.5 rounded-full text-body-xs">
                      {drawerFinding.occurrences} scans
                    </span>
                  </div>
                </div>
              </div>

              {/* Technical Description & Evidence */}
              <div className="flex flex-col gap-4">
                <div>
                  <h4 className="text-body-xs font-bold text-text-muted uppercase tracking-wider mb-2">Technical Description</h4>
                  <div className="text-body-sm text-text-primary leading-relaxed font-normal space-y-0.5">
                    {renderMarkdown(drawerFinding.description)}
                  </div>
                </div>

                {drawerFinding.evidence && (
                  <div>
                    <h4 className="text-body-xs font-bold text-text-muted uppercase tracking-wider mb-2">Discovery Evidence / Payload Proof</h4>
                    <pre className="w-full bg-slate-900 text-slate-200 p-4 rounded-xl text-body-xs font-mono overflow-x-auto leading-relaxed border border-slate-800 whitespace-pre-wrap">
                      {drawerFinding.evidence}
                    </pre>
                  </div>
                )}

                <div>
                  <h4 className="text-body-xs font-bold text-text-muted uppercase tracking-wider mb-2">Remediation Guidelines</h4>
                  <div className="bg-white p-4 rounded-2xl border border-border-warm shadow-sm text-body-sm text-text-primary leading-relaxed font-semibold whitespace-pre-wrap">
                    {drawerFinding.remediation}
                  </div>
                </div>
              </div>

              {/* Standards Mapping (CVE/CWE/OWASP/MITRE) */}
              <div className="bg-white p-4 rounded-2xl border border-border-warm shadow-sm">
                <h4 className="text-body-xs font-bold text-text-muted uppercase tracking-wider mb-3">Vulnerability Standards Mapping</h4>
                <div className="grid grid-cols-2 gap-4 text-body-sm">
                  <div>
                    <span className="text-text-muted font-normal text-body-xs block mb-0.5">CVE ID</span>
                    <span className="font-bold text-slate-900 font-mono bg-slate-50 px-1.5 py-0.5 rounded border border-border-warm">{drawerFinding.cve}</span>
                  </div>
                  <div>
                    <span className="text-text-muted font-normal text-body-xs block mb-0.5">CWE Classification</span>
                    <span className="font-bold text-slate-900 font-mono bg-slate-50 px-1.5 py-0.5 rounded border border-border-warm">{drawerFinding.cwe}</span>
                  </div>
                  <div>
                    <span className="text-text-muted font-normal text-body-xs block mb-0.5">OWASP Top 10 Mapping</span>
                    <span className="font-bold text-slate-800 text-body-xs block truncate mt-1 leading-normal">{drawerFinding.owaspMapping}</span>
                  </div>
                  <div>
                    <span className="text-text-muted font-normal text-body-xs block mb-0.5">MITRE ATT&CK Technique</span>
                    <span className="font-bold text-slate-800 text-body-xs block mt-1">{drawerFinding.mitreAttack}</span>
                  </div>
                </div>
              </div>

              {/* Interactive AI Findings Assistant */}
              <div className="bg-emerald-50/40 border border-emerald-100 rounded-3xl p-5 flex flex-col gap-4">
                <div className="flex items-center gap-1.5 border-b border-emerald-100 pb-3">
                  <Sparkles className="w-5 h-5 text-emerald-600" />
                  <span className="font-extrabold text-slate-900">AI Findings Assistant</span>
                </div>
                
                <p className="text-body-xs text-text-secondary font-semibold">
                  Select an AI audit action below to generate intelligent contextual remediation summaries using Google Gemini.
                </p>

                <div className="grid grid-cols-2 gap-2">
                  <button 
                    onClick={() => handleAIAssistance('explain')}
                    className="px-3 py-2 bg-white hover:bg-emerald-50 text-slate-900 border border-emerald-200 font-bold text-body-xs rounded-xl flex items-center justify-center gap-1 shadow-sm cursor-pointer transition-all"
                  >
                    <BookOpen className="w-3.5 h-3.5 text-emerald-600" /> Explain Risk
                  </button>
                  <button 
                    onClick={() => handleAIAssistance('checklist')}
                    className="px-3 py-2 bg-white hover:bg-emerald-50 text-slate-900 border border-emerald-200 font-bold text-body-xs rounded-xl flex items-center justify-center gap-1 shadow-sm cursor-pointer transition-all"
                  >
                    <ClipboardList className="w-3.5 h-3.5 text-emerald-600" /> Generate Checklist
                  </button>
                  <button 
                    onClick={() => handleAIAssistance('cve')}
                    className="px-3 py-2 bg-white hover:bg-emerald-50 text-slate-900 border border-emerald-200 font-bold text-body-xs rounded-xl flex items-center justify-center gap-1 shadow-sm cursor-pointer transition-all"
                  >
                    <ShieldAlert className="w-3.5 h-3.5 text-emerald-600" /> CVE History
                  </button>
                  <button 
                    onClick={() => handleAIAssistance('priority')}
                    className="px-3 py-2 bg-white hover:bg-emerald-50 text-slate-900 border border-emerald-200 font-bold text-body-xs rounded-xl flex items-center justify-center gap-1 shadow-sm cursor-pointer transition-all"
                  >
                    <Calendar className="w-3.5 h-3.5 text-emerald-600" /> Threat Timeline
                  </button>
                </div>

                {aiLoading && (
                  <div className="p-5 bg-white border border-emerald-100 rounded-2xl flex flex-col gap-2.5 animate-pulse mt-2 text-left">
                    <div className="h-4 bg-emerald-100 rounded w-1/3" />
                    <div className="h-3 bg-slate-100 rounded w-full" />
                    <div className="h-3 bg-slate-100 rounded w-5/6" />
                    <div className="h-3 bg-slate-100 rounded w-4/5" />
                  </div>
                )}

                {aiResponse && !aiLoading && (
                  <div className="mt-2 text-left">
                    <p className="text-[10px] font-extrabold text-emerald-800 mb-1 uppercase tracking-wider">
                      {aiMode === 'explain' && 'Vulnerability Analysis'}
                      {aiMode === 'checklist' && 'Remediation Checklist'}
                      {aiMode === 'cve' && 'CVE/CWE Historical Audit'}
                      {aiMode === 'priority' && 'Threat & Risk Timeline'}
                    </p>
                    <div className="p-4 bg-white border border-emerald-100 rounded-2xl leading-relaxed text-body-sm font-semibold max-h-[300px] overflow-y-auto shadow-inner text-slate-800 whitespace-pre-wrap">
                      {aiResponse}
                    </div>
                  </div>
                )}
              </div>

              {/* Triage Comments / Notes Section */}
              <div className="flex flex-col gap-2 bg-white p-4 rounded-2xl border border-border-warm shadow-sm">
                <h4 className="text-body-xs font-bold text-text-muted uppercase tracking-wider block mb-1">Triage Comments & Notes</h4>
                <textarea 
                  value={drawerNotes}
                  onChange={(e) => setDrawerNotes(e.target.value)}
                  placeholder="Record remediation status notes, compliance justifications, or team comments here..."
                  rows={3}
                  className="w-full bg-bg-secondary border border-border-warm rounded-xl p-3 text-body-sm font-semibold text-text-primary outline-none focus:bg-white transition-all resize-none"
                />
                <button 
                  onClick={handleSaveNotes}
                  disabled={notesSaving}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-body-xs rounded-xl shadow cursor-pointer transition-all disabled:opacity-50 self-end mt-2"
                >
                  {notesSaving ? 'Saving...' : 'Save Triage Note'}
                </button>
              </div>

            </div>

          </div>

        </div>
      )}
    </DashboardLayout>
  );
}
