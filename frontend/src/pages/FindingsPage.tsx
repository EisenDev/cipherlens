import { useState, useEffect } from 'react';
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
  Filter, 
  Search, 
  ChevronRight, 
  X, 
  ChevronDown, 
  Calendar,
  AlertTriangle,
  ArrowUpDown,
  BookOpen,
  ClipboardList
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
    resolvedThisWeek: 0,
    avgHoursToResolution: 0,
    assetsWithActive: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState('');
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

  // Assets list for dropdown filter
  const [assets, setAssets] = useState<Asset[]>([]);

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

  // Fetch lists for filter options
  useEffect(() => {
    if (authAccessToken) {
      apiRequest('/assets')
        .then((res) => setAssets(res))
        .catch(() => {});
    }
  }, [authAccessToken]);

  // Fetch Findings on filter change
  const fetchFindings = () => {
    if (!authAccessToken) return;
    setLoading(true);

    const params = new URLSearchParams();
    if (search) params.append('search', search);
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

    apiRequest(`/findings?${params.toString()}`)
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

  // Search debounce
  useEffect(() => {
    const handler = setTimeout(() => {
      fetchFindings();
    }, 400);
    return () => clearTimeout(handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

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
      await apiRequest('/findings/status', {
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
      await apiRequest('/findings/status', {
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

      const res = await apiRequest('/findings/bulk', {
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
      await apiRequest('/findings/status', {
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
      const res = await apiRequest('/findings/ai-assistance', {
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
      const allKeys = findings.map(f => ({ findingCode: f.findingCode, assetId: f.asset.id }));
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
    if (status === 'Open') return 'bg-red-50 text-red-700 border-red-200';
    if (status === 'Investigating') return 'bg-blue-50 text-blue-700 border-blue-200';
    if (status === 'In Progress') return 'bg-indigo-50 text-indigo-700 border-indigo-200';
    if (status === 'Resolved' || status === 'Fixed' || status === 'Mitigated') return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    if (status === 'Accepted Risk') return 'bg-amber-50 text-amber-700 border-amber-200';
    return 'bg-slate-50 text-slate-700 border-slate-200';
  };

  const formatDate = (isoStr: string) => {
    const date = new Date(isoStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) + ' ' + date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  const sortedFindings = getSortedFindings();

  return (
    <DashboardLayout activePage="findings">
      <div className="flex flex-col gap-6 w-full max-w-[1400px] mx-auto pb-10">
        
        {/* Top Header */}
        <div className="flex justify-between items-center px-4">
          <div className="text-left">
            <h1 className="text-2xl font-bold text-text-primary" style={{ fontFamily: 'var(--font-heading)' }}>
              Findings
            </h1>
            <p className="text-text-muted text-body-sm mt-1" style={{ fontFamily: 'var(--font-body)' }}>
              Centralized vulnerability management across all scanned assets.
            </p>
          </div>
          <div className="flex gap-3">
            <button 
              onClick={() => alert('Feature scheduled for Phase 3.2 release')}
              className="px-4 py-2 bg-white border border-border-warm text-text-primary font-bold text-body-sm rounded-xl cursor-pointer hover:bg-bg-secondary transition-all shadow-sm flex items-center gap-1.5"
            >
              Export Report
            </button>
            {selectedFindingKeys.length > 0 && (
              <div className="relative group">
                <button className="px-4 py-2 bg-slate-900 text-white font-bold text-body-sm rounded-xl cursor-pointer hover:bg-slate-800 transition-all shadow-sm flex items-center gap-1.5">
                  Bulk Actions ({selectedFindingKeys.length}) <ChevronDown className="w-4 h-4" />
                </button>
                <div className="absolute right-0 mt-2 w-48 bg-white border border-border-warm rounded-2xl shadow-lg py-2 hidden group-hover:block z-50 text-left">
                  <button 
                    onClick={() => handleBulkAction('status', 'Investigating')}
                    className="w-full px-4 py-2 text-body-sm text-text-primary hover:bg-bg-secondary font-semibold transition-colors flex items-center gap-2"
                  >
                    Set: Investigating
                  </button>
                  <button 
                    onClick={() => handleBulkAction('status', 'Accepted Risk')}
                    className="w-full px-4 py-2 text-body-sm text-text-primary hover:bg-bg-secondary font-semibold transition-colors flex items-center gap-2"
                  >
                    Set: Accepted Risk
                  </button>
                  <button 
                    onClick={() => handleBulkAction('status', 'Resolved')}
                    className="w-full px-4 py-2 text-body-sm text-text-primary hover:bg-bg-secondary font-semibold transition-colors flex items-center gap-2"
                  >
                    Set: Fixed/Resolved
                  </button>
                  <hr className="my-1 border-border-warm" />
                  <button 
                    onClick={() => handleBulkAction('assign', 'Arjay Escabas')}
                    className="w-full px-4 py-2 text-body-sm text-text-primary hover:bg-bg-secondary font-semibold transition-colors flex items-center gap-2"
                  >
                    Assign to Me
                  </button>
                  <button 
                    onClick={() => handleBulkAction('validate')}
                    className="w-full px-4 py-2 text-body-sm text-emerald-700 hover:bg-bg-secondary font-bold transition-colors flex items-center gap-2"
                  >
                    Re-run Validation
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* KPI Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 px-4">
          <div className="bg-white p-4 rounded-2xl border border-border-warm shadow-sm text-left">
            <p className="text-text-muted text-body-xs font-bold uppercase tracking-wider">Total Active Findings</p>
            <h3 className="text-3xl font-extrabold text-text-primary mt-2">{stats.totalActive}</h3>
            <p className="text-body-xs font-semibold text-text-muted mt-1">across all projects</p>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-border-warm shadow-sm text-left flex flex-col justify-between">
            <div>
              <p className="text-text-muted text-body-xs font-bold uppercase tracking-wider flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse" /> Critical Findings
              </p>
              <h3 className="text-3xl font-extrabold text-red-600 mt-2">{stats.criticalActive}</h3>
            </div>
            <p className="text-body-xs font-semibold text-red-700/80 mt-1">▲ 1 from last scan</p>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-border-warm shadow-sm text-left flex flex-col justify-between">
            <div>
              <p className="text-text-muted text-body-xs font-bold uppercase tracking-wider flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-orange-500" /> High Findings
              </p>
              <h3 className="text-3xl font-extrabold text-orange-600 mt-2">{stats.highActive}</h3>
            </div>
            <p className="text-body-xs font-semibold text-orange-600/80 mt-1">▲ 2 from last scan</p>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-border-warm shadow-sm text-left">
            <p className="text-text-muted text-body-xs font-bold uppercase tracking-wider">Resolved This Week</p>
            <h3 className="text-3xl font-extrabold text-emerald-600 mt-2">{stats.resolvedThisWeek}</h3>
            <p className="text-body-xs font-semibold text-emerald-700/80 mt-1">▼ 1 from last scan</p>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-border-warm shadow-sm text-left">
            <p className="text-text-muted text-body-xs font-bold uppercase tracking-wider">Avg Time To Resolution</p>
            <h3 className="text-3xl font-extrabold text-text-primary mt-2">{stats.avgHoursToResolution}h</h3>
            <p className="text-body-xs font-semibold text-text-muted mt-1">remediation velocity</p>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-border-warm shadow-sm text-left">
            <p className="text-text-muted text-body-xs font-bold uppercase tracking-wider">Assets With Findings</p>
            <h3 className="text-3xl font-extrabold text-text-primary mt-2">{stats.assetsWithActive}</h3>
            <p className="text-body-xs font-semibold text-text-muted mt-1">active exposure surface</p>
          </div>
        </div>

        {/* Filters Sidebar + Main Content Table Split Layout */}
        <div className="grid grid-cols-12 gap-6 px-4">
          
          {/* Left Advanced Filters Panel (col-span-3) */}
          <div className="col-span-12 lg:col-span-3 flex flex-col gap-4">
            <div className="bg-white rounded-3xl border border-border-warm p-5 shadow-sm text-left flex flex-col gap-5">
              <div className="flex justify-between items-center border-b border-border-warm pb-3">
                <span className="font-extrabold text-text-primary flex items-center gap-1.5">
                  <Filter className="w-4 h-4 text-text-muted" /> Advanced Filters
                </span>
                <button 
                  onClick={handleResetFilters}
                  className="text-body-xs font-bold text-text-muted hover:text-slate-900 transition-colors cursor-pointer"
                >
                  Reset
                </button>
              </div>

              {/* Severity Filter */}
              <div>
                <label className="text-body-xs font-bold text-text-muted uppercase tracking-wider block mb-2">Severity</label>
                <div className="flex flex-col gap-1.5">
                  {['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO'].map(sev => (
                    <label key={sev} className="flex items-center gap-2 text-body-sm text-text-primary font-semibold select-none cursor-pointer">
                      <input 
                        type="checkbox"
                        checked={selectedSeverities.includes(sev)}
                        onChange={(e) => {
                          if (e.target.checked) setSelectedSeverities([...selectedSeverities, sev]);
                          else setSelectedSeverities(selectedSeverities.filter(s => s !== sev));
                        }}
                        className="rounded border-border-warm text-slate-900 focus:ring-slate-500"
                      />
                      <span>{sev.charAt(0) + sev.slice(1).toLowerCase()}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Status Filter */}
              <div>
                <label className="text-body-xs font-bold text-text-muted uppercase tracking-wider block mb-2">Status</label>
                <div className="flex flex-col gap-1.5">
                  {['Open', 'Investigating', 'In Progress', 'Accepted Risk', 'Resolved', 'Mitigated', 'Fixed', 'False Positive'].map(stat => (
                    <label key={stat} className="flex items-center gap-2 text-body-sm text-text-primary font-semibold select-none cursor-pointer">
                      <input 
                        type="checkbox"
                        checked={selectedStatuses.includes(stat)}
                        onChange={(e) => {
                          if (e.target.checked) setSelectedStatuses([...selectedStatuses, stat]);
                          else setSelectedStatuses(selectedStatuses.filter(s => s !== stat));
                        }}
                        className="rounded border-border-warm text-slate-900 focus:ring-slate-500"
                      />
                      <span>{stat}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Asset Selector */}
              <div>
                <label className="text-body-xs font-bold text-text-muted uppercase tracking-wider block mb-2">Asset</label>
                <select 
                  value={selectedAssetId}
                  onChange={(e) => setSelectedAssetId(e.target.value)}
                  className="w-full bg-bg-secondary border border-border-warm rounded-xl px-3 py-2 text-body-sm font-semibold text-text-primary outline-none focus:border-text-muted"
                >
                  <option value="">All Assets</option>
                  {assets.map(asset => (
                    <option key={asset.id} value={asset.id}>{asset.name}</option>
                  ))}
                </select>
              </div>

              {/* Category / Scanner Filter */}
              <div>
                <label className="text-body-xs font-bold text-text-muted uppercase tracking-wider block mb-2">Scanner Category</label>
                <select 
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full bg-bg-secondary border border-border-warm rounded-xl px-3 py-2 text-body-sm font-semibold text-text-primary outline-none focus:border-text-muted mb-2.5"
                >
                  <option value="">All Categories</option>
                  <option value="Security Headers">Security Headers</option>
                  <option value="Protocol">Protocol/TLS</option>
                  <option value="Subdomains">Subdomains</option>
                  <option value="Cookies">Cookies</option>
                  <option value="Network Exposure">Network Exposure</option>
                </select>

                <label className="text-body-xs font-bold text-text-muted uppercase tracking-wider block mb-2">Scanner Module</label>
                <select 
                  value={selectedScanner}
                  onChange={(e) => setSelectedScanner(e.target.value)}
                  className="w-full bg-bg-secondary border border-border-warm rounded-xl px-3 py-2 text-body-sm font-semibold text-text-primary outline-none focus:border-text-muted"
                >
                  <option value="">All Modules</option>
                  <option value="headers">Security Headers (Nuclei)</option>
                  <option value="ssl">SSL Audit (TestSSL)</option>
                  <option value="tls">TLS check</option>
                  <option value="ports">Port Scanner</option>
                  <option value="subdomains">Subfinder</option>
                  <option value="technology">Httpx Tech</option>
                </select>
              </div>

              {/* CVSS Score Filter */}
              <div>
                <label className="text-body-xs font-bold text-text-muted uppercase tracking-wider block mb-2">CVSS Score Range</label>
                <div className="grid grid-cols-2 gap-2">
                  <input 
                    type="number"
                    step="0.1"
                    placeholder="Min"
                    value={cvssMin}
                    onChange={(e) => setCvssMin(e.target.value)}
                    className="w-full bg-bg-secondary border border-border-warm rounded-xl px-3 py-2 text-body-sm font-semibold text-text-primary outline-none text-center"
                  />
                  <input 
                    type="number"
                    step="0.1"
                    placeholder="Max"
                    value={cvssMax}
                    onChange={(e) => setCvssMax(e.target.value)}
                    className="w-full bg-bg-secondary border border-border-warm rounded-xl px-3 py-2 text-body-sm font-semibold text-text-primary outline-none text-center"
                  />
                </div>
              </div>

              {/* Date Picker Range */}
              <div>
                <label className="text-body-xs font-bold text-text-muted uppercase tracking-wider block mb-2">Discovered Date Range</label>
                <div className="flex flex-col gap-2">
                  <input 
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="w-full bg-bg-secondary border border-border-warm rounded-xl px-3 py-2 text-body-sm font-semibold text-text-primary outline-none"
                  />
                  <input 
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="w-full bg-bg-secondary border border-border-warm rounded-xl px-3 py-2 text-body-sm font-semibold text-text-primary outline-none"
                  />
                </div>
              </div>

            </div>
          </div>

          {/* Right Main Table Workspace (col-span-9) */}
          <div className="col-span-12 lg:col-span-9 flex flex-col gap-4">
            
            {/* Search Input Bar */}
            <div className="relative w-full">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
              <input 
                type="text"
                placeholder="Search findings by title, description, or CVE code..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-white border border-border-warm rounded-2xl pl-11 pr-4 py-3 text-body-sm font-semibold text-text-primary outline-none focus:border-text-muted shadow-sm transition-all"
              />
            </div>

            {/* Findings Main Table */}
            <div className="bg-white rounded-3xl border border-border-warm shadow-sm overflow-hidden">
              {loading ? (
                <div className="py-20 flex flex-col items-center justify-center gap-3">
                  <div className="w-10 h-10 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
                  <p className="text-text-muted text-body-sm font-bold animate-pulse">Loading findings workspace...</p>
                </div>
              ) : error ? (
                <div className="py-16 text-center">
                  <AlertTriangle className="w-10 h-10 text-red-500 mx-auto mb-2" />
                  <p className="text-red-700 font-extrabold text-body-sm">{error}</p>
                </div>
              ) : sortedFindings.length === 0 ? (
                <div className="py-20 text-center flex flex-col items-center justify-center gap-3">
                  <ShieldCheck className="w-12 h-12 text-emerald-500" />
                  <h3 className="font-extrabold text-text-primary text-body-lg">Clean Workspace!</h3>
                  <p className="text-text-muted text-body-sm max-w-md">No vulnerability findings match your filters. Your target environment is secure.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-left">
                    <thead>
                      <tr className="bg-bg-secondary border-b border-border-warm text-body-xs font-bold uppercase tracking-wider text-text-muted select-none">
                        <th className="px-6 py-4 w-12 text-center">
                          <input 
                            type="checkbox"
                            checked={selectedFindingKeys.length === findings.length && findings.length > 0}
                            onChange={(e) => handleSelectAll(e.target.checked)}
                            className="rounded border-border-warm text-slate-900 focus:ring-slate-500 cursor-pointer"
                          />
                        </th>
                        <th className="px-6 py-4 w-32 cursor-pointer hover:text-slate-950 transition-colors" onClick={() => handleSort('severity')}>
                          <span className="flex items-center gap-1">Severity <ArrowUpDown className="w-3.5 h-3.5" /></span>
                        </th>
                        <th className="px-6 py-4 cursor-pointer hover:text-slate-950 transition-colors" onClick={() => handleSort('title')}>
                          <span className="flex items-center gap-1">Finding Title <ArrowUpDown className="w-3.5 h-3.5" /></span>
                        </th>
                        <th className="px-6 py-4">Asset</th>
                        <th className="px-6 py-4">Scanner / Category</th>
                        <th className="px-6 py-4 w-20 cursor-pointer hover:text-slate-950 transition-colors" onClick={() => handleSort('cvss')}>
                          <span className="flex items-center gap-1">CVSS <ArrowUpDown className="w-3.5 h-3.5" /></span>
                        </th>
                        <th className="px-6 py-4 w-28">Status</th>
                        <th className="px-6 py-4 w-12 text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border-warm text-body-sm font-semibold text-text-primary">
                      {sortedFindings.map((f) => {
                        const isChecked = selectedFindingKeys.some(k => k.findingCode === f.findingCode && k.assetId === f.asset.id);
                        return (
                          <tr 
                            key={`${f.findingCode}-${f.asset.id}`} 
                            className="hover:bg-bg-secondary/40 transition-colors group cursor-pointer"
                          >
                            <td className="px-6 py-4 text-center" onClick={(e) => e.stopPropagation()}>
                              <input 
                                type="checkbox"
                                checked={isChecked}
                                onChange={(e) => handleSelectOne(e.target.checked, f.findingCode, f.asset.id)}
                                className="rounded border-border-warm text-slate-900 focus:ring-slate-500 cursor-pointer"
                              />
                            </td>
                            
                            <td className="px-6 py-4" onClick={() => { setDrawerFinding(f); setDrawerNotes(f.notes); setAiResponse(null); setAiMode(null); }}>
                              <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-body-xs font-extrabold border uppercase select-none ${getSeverityStyle(f.severity)}`}>
                                {getSeverityIcon(f.severity)} {f.severity}
                              </span>
                            </td>

                            <td className="px-6 py-4" onClick={() => { setDrawerFinding(f); setDrawerNotes(f.notes); setAiResponse(null); setAiMode(null); }}>
                              <div>
                                <p className="font-extrabold text-slate-900 group-hover:text-slate-950 transition-colors">{f.title}</p>
                                <p className="text-body-xs text-text-muted font-normal leading-relaxed mt-0.5 max-w-sm truncate">{f.description}</p>
                                <div className="flex gap-1.5 mt-1.5">
                                  {f.cve && f.cve !== 'N/A' && (
                                    <span className="inline-block px-1.5 py-0.5 bg-slate-100 text-slate-700 rounded text-[9px] font-bold tracking-wider">{f.cve}</span>
                                  )}
                                  {f.cwe && f.cwe !== 'N/A' && (
                                    <span className="inline-block px-1.5 py-0.5 bg-slate-100 text-slate-700 rounded text-[9px] font-bold tracking-wider">{f.cwe}</span>
                                  )}
                                </div>
                              </div>
                            </td>

                            <td className="px-6 py-4" onClick={() => { setDrawerFinding(f); setDrawerNotes(f.notes); setAiResponse(null); setAiMode(null); }}>
                              <div>
                                <p className="font-bold text-slate-800">{f.asset.name}</p>
                                <p className="text-body-xs text-text-muted font-normal font-mono truncate max-w-xs">{f.asset.url}</p>
                              </div>
                            </td>

                            <td className="px-6 py-4" onClick={() => { setDrawerFinding(f); setDrawerNotes(f.notes); setAiResponse(null); setAiMode(null); }}>
                              <div>
                                <p className="font-bold text-slate-700 capitalize">{f.scanner}</p>
                                <p className="text-body-xs text-text-muted font-medium mt-0.5">{f.category || 'Vulnerability'}</p>
                              </div>
                            </td>

                            <td className="px-6 py-4 text-center font-mono text-body-sm font-extrabold text-slate-800" onClick={() => { setDrawerFinding(f); setDrawerNotes(f.notes); setAiResponse(null); setAiMode(null); }}>
                              <span className={f.cvss !== '--' && parseFloat(f.cvss) >= 7.0 ? 'text-red-600' : 'text-slate-700'}>
                                {f.cvss}
                              </span>
                            </td>

                            <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                              <div className="relative inline-block w-full">
                                <select 
                                  value={f.status}
                                  onChange={(e) => handleStatusChange(f.findingCode, f.asset.id, e.target.value)}
                                  className={`appearance-none w-full border font-bold text-body-xs rounded-xl px-2.5 py-1.5 pr-6 cursor-pointer outline-none transition-all shadow-sm ${getStatusBadgeStyle(f.status)}`}
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
                                <ChevronDown className="w-3.5 h-3.5 absolute right-2 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
                              </div>
                            </td>

                            <td className="px-6 py-4 text-center" onClick={(e) => e.stopPropagation()}>
                              <div className="relative group inline-block">
                                <button className="p-1.5 hover:bg-bg-secondary rounded-lg text-text-muted hover:text-slate-800 transition-colors">
                                  <ChevronRight className="w-4 h-4" />
                                </button>
                                <div className="absolute right-0 mt-1 w-44 bg-white border border-border-warm rounded-2xl shadow-lg py-2 hidden group-hover:block z-50 text-left">
                                  <button 
                                    onClick={() => handleAssigneeChange(f.findingCode, f.asset.id, 'Arjay Escabas')}
                                    className="w-full px-4 py-2 text-body-xs text-text-primary hover:bg-bg-secondary font-bold transition-colors"
                                  >
                                    Assign to Me
                                  </button>
                                  <button 
                                    onClick={() => { setDrawerFinding(f); setDrawerNotes(f.notes); setAiResponse(null); setAiMode(null); }}
                                    className="w-full px-4 py-2 text-body-xs text-text-primary hover:bg-bg-secondary font-bold transition-colors"
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
                  {getSeverityIcon(drawerFinding.severity)} {drawerFinding.severity} Severity
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
                    <span className="font-bold text-slate-850 text-body-xs">{formatDate(drawerFinding.firstSeen)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-muted font-normal">Last Seen</span>
                    <span className="font-bold text-slate-850 text-body-xs">{formatDate(drawerFinding.lastSeen)}</span>
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
                  <p className="text-body-sm text-text-primary leading-relaxed font-semibold">
                    {drawerFinding.description}
                  </p>
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
