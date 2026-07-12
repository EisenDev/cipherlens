import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import DashboardLayout from '../components/DashboardLayout';
import PageHeading from '../components/PageHeading';
import Card from '../components/Card';
import { apiRequest } from '../api/client';
import { PagesFontSize } from '../components/PagesFontSize';
import {
  Database,
  Search,
  Plus,
  RefreshCw,
  Trash2,
  Edit,
  Play,
  FileText,
  AlertTriangle,
  CheckCircle,
  Clock,
  ExternalLink,
  ChevronRight,
  Shield,
  Zap,
  Network,
  Lock,
  Globe,
  Settings,
  MoreVertical,
  Activity,
  X,
  FileSpreadsheet
} from 'lucide-react';

interface AssetRecord {
  id: string;
  name: string;
  url: string;
  type: string;
  createdAt: string;
  security_posture: string | null;
  latest_scan_status: string | null;
  latest_scan_date: string | null;
  critical_findings: number;
  total_findings: number;
  confidence: number | null;
  coverage: number | null;
  owner: string | null;
  tags: string[];
  description: string | null;
}

interface ScanHistoryItem {
  id: string;
  createdAt: string;
  duration: number | null;
  modules: string[];
  findingsCount: number;
  status: string;
  score: number | null;
}

interface AssetDetail {
  id: string;
  name: string;
  url: string;
  type: string;
  createdAt: string;
  security_posture: string | null;
  latest_scan_status: string | null;
  latest_scan_date: string | null;
  confidence: number | null;
  coverage: number | null;
  owner: string | null;
  tags: string[];
  environment: string;
  business_criticality: string;
  description: string | null;
  findings_summary: {
    critical: number;
    high: number;
    medium: number;
    low: number;
    info: number;
  };
  open_findings: number;
  resolved_findings: number;
  new_findings: number;
  open_ports: number[];
  tech_fingerprint: string[];
  dns_info: {
    A?: string[];
    AAAA?: string[];
    MX?: string[];
    TXT?: string[];
    SPF: string;
    DMARC: string;
    DKIM: string;
  };
  certificate: {
    issuer: string;
    expiration: string | null;
    days_remaining: number | null;
    san: string[];
    tls_version: string;
  };
  security_headers: Record<string, string>;
  scan_history: ScanHistoryItem[];
}
const getTechLogo = (tech: string) => {
  const t = tech.toLowerCase();
  if (t.includes('react')) return 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/react/react-original.svg';
  if (t.includes('next')) return 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/nextjs/nextjs-original.svg';
  if (t.includes('vue')) return 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/vuejs/vuejs-original.svg';
  if (t.includes('node')) return 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/nodejs/nodejs-original.svg';
  if (t.includes('express')) return 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/express/express-original.svg';
  if (t.includes('django')) return 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/django/django-plain.svg';
  if (t.includes('laravel')) return 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/laravel/laravel-original.svg';
  if (t.includes('nginx')) return 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/nginx/nginx-original.svg';
  if (t.includes('postgre')) return 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/postgresql/postgresql-original.svg';
  if (t.includes('mysql')) return 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/mysql/mysql-original.svg';
  if (t.includes('mariadb')) return 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/mariadb/mariadb-original.svg';
  if (t.includes('mongo')) return 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/mongodb/mongodb-original.svg';
  if (t.includes('redis')) return 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/redis/redis-original.svg';
  if (t.includes('stripe')) return 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/stripe/stripe-plain.svg';
  if (t.includes('cloudflare')) return 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/cloudflare/cloudflare-original.svg';
  if (t.includes('webpack')) return 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/webpack/webpack-original.svg';
  if (t.includes('tailwind')) return 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/tailwindcss/tailwindcss-original.svg';
  if (t.includes('flask')) return 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/flask/flask-original.svg';
  if (t.includes('sqlite')) return 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/sqlite/sqlite-original.svg';
  return null;
};

export default function AssetsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { id: selectedAssetId } = useParams<{ id: string }>();

  // Filters & State
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [postureFilter, setPostureFilter] = useState('');
  const [envFilter, setEnvFilter] = useState('');
  
  // Custom Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Active Dropdown Action Row
  const [activeDropdownAssetId, setActiveDropdownAssetId] = useState<string | null>(null);

  // Modals state
  const [isAddEditOpen, setIsAddEditOpen] = useState(false);
  const [assetToEdit, setAssetToEdit] = useState<AssetRecord | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    url: '',
    type: 'WEBSITE',
    environment: 'Production',
    criticality: 'High',
    description: '',
    tags: ''
  });

  // Custom Confirmation Modals State
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [scanRedirectAsset, setScanRedirectAsset] = useState<AssetRecord | AssetDetail | null>(null);
  
  // Bulk selection
  const [selectedAssetKeys, setSelectedAssetKeys] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'history' | 'findings' | 'tech' | 'discovery'>('overview');

  // Debounce search input
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
      setCurrentPage(1);
    }, 400);
    return () => clearTimeout(handler);
  }, [search]);

  // React Query: Get all Assets
  const { data: assetsData = [], isPending, refetch } = useQuery<AssetRecord[]>({
    queryKey: ['assets'],
    queryFn: () => apiRequest('/api/assets'),
  });

  // React Query: Get Asset Detail
  const { data: assetDetail, isPending: detailPending } = useQuery<AssetDetail>({
    queryKey: ['asset-detail', selectedAssetId],
    queryFn: () => apiRequest(`/api/assets/${selectedAssetId}`),
    enabled: !!selectedAssetId,
  });

  // Mutate: Create Asset
  const createAssetMutation = useMutation({
    mutationFn: (payload: any) => apiRequest('/api/assets', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      setIsAddEditOpen(false);
      resetForm();
    },
    onError: (err: any) => alert(err.message || 'Failed to create asset.'),
  });

  // Mutate: Edit Asset
  const editAssetMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: any }) => apiRequest(`/api/assets/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      if (selectedAssetId) queryClient.invalidateQueries({ queryKey: ['asset-detail', selectedAssetId] });
      setIsAddEditOpen(false);
      setAssetToEdit(null);
      resetForm();
    },
    onError: (err: any) => alert(err.message || 'Failed to edit asset.'),
  });

  // Mutate: Delete Asset
  const deleteAssetMutation = useMutation({
    mutationFn: (id: string) => apiRequest(`/api/assets/${id}`, {
      method: 'DELETE',
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      setDeleteConfirmId(null);
      setSelectedAssetKeys([]);
      if (selectedAssetId) navigate('/assets');
    },
    onError: (err: any) => alert(err.message || 'Failed to delete asset.'),
  });

  const resetForm = () => {
    setFormData({
      name: '',
      url: '',
      type: 'WEBSITE',
      environment: 'Production',
      criticality: 'High',
      description: '',
      tags: ''
    });
  };

  const handleOpenAdd = () => {
    setAssetToEdit(null);
    resetForm();
    setIsAddEditOpen(true);
  };

  const handleOpenEdit = (asset: AssetRecord | AssetDetail, e: React.MouseEvent) => {
    e.stopPropagation();
    
    // Convert format tags if list
    const tagsString = asset.tags ? asset.tags.join(', ') : '';
    
    // Set Edit state
    const editRecord: AssetRecord = {
      id: asset.id,
      name: asset.name,
      url: asset.url,
      type: asset.type,
      createdAt: asset.createdAt,
      security_posture: asset.security_posture,
      latest_scan_status: asset.latest_scan_status,
      latest_scan_date: asset.latest_scan_date,
      critical_findings: 'findings_summary' in asset ? asset.findings_summary.critical : asset.critical_findings,
      total_findings: 'open_findings' in asset ? asset.open_findings : asset.total_findings,
      confidence: asset.confidence,
      coverage: asset.coverage,
      owner: asset.owner,
      tags: asset.tags,
      description: asset.description
    };

    setAssetToEdit(editRecord);
    setFormData({
      name: asset.name,
      url: asset.url,
      type: asset.type,
      environment: asset.url.includes('staging') ? 'Staging' : asset.url.includes('dev') ? 'Development' : 'Production',
      criticality: asset.url.includes('staging') ? 'Medium' : asset.url.includes('dev') ? 'Low' : 'High',
      description: asset.description || `Automated defensive mapping target for ${asset.name}.`,
      tags: tagsString
    });
    setIsAddEditOpen(true);
  };

  const handleSaveAsset = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.url.trim()) {
      alert('Name and URL are required.');
      return;
    }

    const payload = {
      name: formData.name.trim(),
      url: formData.url.trim(),
      type: formData.type,
      description: formData.description.trim(),
      tags: formData.tags.trim()
    };

    if (assetToEdit) {
      editAssetMutation.mutate({ id: assetToEdit.id, payload });
    } else {
      createAssetMutation.mutate(payload);
    }
  };

  const handleDeleteConfirmClick = () => {
    if (deleteConfirmId) {
      deleteAssetMutation.mutate(deleteConfirmId);
    }
  };

  const handleScanRedirect = (asset: AssetRecord | AssetDetail) => {
    setScanRedirectAsset(asset);
  };

  const executeScanRedirect = () => {
    if (!scanRedirectAsset) return;
    
    // Navigate to scans page passing initial details
    navigate('/scans', {
      state: {
        openNewScan: true,
        initialConfig: {
          targetUrl: scanRedirectAsset.url,
          targetType: scanRedirectAsset.type,
          scanType: 'CUSTOM',
          scanName: `${scanRedirectAsset.name} - Custom Scan`,
          scanTags: scanRedirectAsset.tags?.join(',') || 'rescan'
        }
      }
    });
    setScanRedirectAsset(null);
  };

  // Filtering Logic
  const filteredAssets = assetsData.filter(asset => {
    const matchesSearch = 
      asset.name.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
      asset.url.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
      (asset.owner || '').toLowerCase().includes(debouncedSearch.toLowerCase());
      
    const matchesType = typeFilter ? asset.type === typeFilter : true;
    const matchesPosture = postureFilter ? (asset.security_posture || 'Unknown').toLowerCase() === postureFilter.toLowerCase() : true;
    
    const env = asset.url.includes('staging') ? 'Staging' : asset.url.includes('dev') ? 'Development' : 'Production';
    const matchesEnv = envFilter ? env === envFilter : true;

    return matchesSearch && matchesType && matchesPosture && matchesEnv;
  });

  // Pagination Logic
  const totalItems = filteredAssets.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedAssets = filteredAssets.slice(startIndex, startIndex + itemsPerPage);

  // Statistics summaries
  const totalAssetsCount = assetsData.length;
  const healthyCount = assetsData.filter(a => ['excellent', 'good'].includes((a.security_posture || '').toLowerCase())).length;
  const criticalPostureCount = assetsData.filter(a => (a.security_posture || '').toLowerCase() === 'critical').length;
  const missingScanCount = assetsData.filter(a => !a.latest_scan_date).length;

  const averagePostureValue = (() => {
    const scores: Record<string, number> = { excellent: 5, good: 4, fair: 3, poor: 2, critical: 1 };
    const validPostures = assetsData.map(a => (a.security_posture || '').toLowerCase()).filter(p => scores[p]);
    if (!validPostures.length) return 'N/A';
    const sum = validPostures.reduce((acc, p) => acc + scores[p], 0);
    const avg = Math.round(sum / validPostures.length);
    const postureNames = ['', 'Critical', 'Poor', 'Fair', 'Good', 'Excellent'];
    return postureNames[avg];
  })();

  const averageConfidence = (() => {
    const validConf = assetsData.map(a => a.confidence).filter(c => c !== null) as number[];
    if (!validConf.length) return 'N/A';
    return Math.round(validConf.reduce((a, b) => a + b, 0) / validConf.length) + '%';
  })();

  const averageCoverage = (() => {
    const validCov = assetsData.map(a => a.coverage).filter(c => c !== null) as number[];
    if (!validCov.length) return 'N/A';
    return Math.round(validCov.reduce((a, b) => a + b, 0) / validCov.length) + '%';
  })();

  const handleRowClick = (assetId: string) => {
    navigate(`/assets/${assetId}`);
    setActiveTab('overview');
  };

  const toggleSelectAll = () => {
    if (selectedAssetKeys.length === paginatedAssets.length) {
      setSelectedAssetKeys([]);
    } else {
      setSelectedAssetKeys(paginatedAssets.map(a => a.id));
    }
  };

  const toggleSelectRow = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (selectedAssetKeys.includes(id)) {
      setSelectedAssetKeys(selectedAssetKeys.filter(k => k !== id));
    } else {
      setSelectedAssetKeys([...selectedAssetKeys, id]);
    }
  };

  const handleBulkDelete = () => {
    if (confirm(`Are you sure you want to delete ${selectedAssetKeys.length} selected assets?`)) {
      selectedAssetKeys.forEach(id => deleteAssetMutation.mutate(id));
      setSelectedAssetKeys([]);
    }
  };

  const handleBulkScan = () => {
    if (confirm(`Trigger scans on ${selectedAssetKeys.length} selected assets?`)) {
      selectedAssetKeys.forEach(id => {
        const asset = assetsData.find(a => a.id === id);
        if (asset) {
          navigate('/scans', {
            state: {
              openNewScan: true,
              initialConfig: {
                targetUrl: asset.url,
                targetType: asset.type,
                scanType: 'CUSTOM',
                scanName: `${asset.name} - Custom Bulk Scan`,
                scanTags: asset.tags?.join(',') || 'bulk'
              }
            }
          });
        }
      });
      setSelectedAssetKeys([]);
    }
  };

  const getPostureColor = (posture: string | null) => {
    const p = (posture || '').toUpperCase();
    if (p === 'EXCELLENT' || p === 'GOOD') return 'text-text-primary bg-success-bg border-border';
    if (p === 'FAIR') return 'text-text-primary bg-warning-bg border-border';
    if (p === 'POOR') return 'text-text-primary bg-orange-50 border-border';
    if (p === 'CRITICAL') return 'text-text-primary bg-danger-bg border-border';
    return 'text-text-primary bg-bg-secondary border-border';
  };

  return (
    <DashboardLayout activePage="assets">
      <div className="py-8 px-10 space-y-7 w-full text-left min-h-screen">
        
        {/* Detail view header / standard header */}
        {selectedAssetId && assetDetail ? (
          <div className="flex flex-col gap-4 pt-2">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-border pb-5">
              <div className="space-y-1">
                <div className="flex items-center gap-2.5">
                  <h1 className="text-2xl font-extrabold text-text-primary tracking-tight">{assetDetail.name}</h1>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-bg-secondary border border-border text-text-muted uppercase">
                    {assetDetail.type}
                  </span>
                  <span className="w-2.5 h-2.5 rounded-full bg-success-bg0 animate-pulse" title="Asset active & monitored" />
                </div>
                <p className="text-xs text-text-muted font-semibold flex items-center gap-4 flex-wrap">
                  <span>URL: <a href={assetDetail.url.startsWith('http') ? assetDetail.url : `https://${assetDetail.url}`} target="_blank" rel="noopener noreferrer" className="hover:underline text-accent inline-flex items-center gap-0.5">{assetDetail.url} <ExternalLink className="w-2.5 h-2.5" /></a></span>
                  {assetDetail.latest_scan_date && (
                    <span>Last Scanned: {new Date(assetDetail.latest_scan_date).toLocaleString()}</span>
                  )}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleScanRedirect(assetDetail)}
                  className="px-4 py-2 bg-accent hover:bg-accent-dark text-text-primary rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer flex items-center gap-1.5"
                >
                  <Play className="w-3.5 h-3.5 fill-current" /> Scan Now
                </button>
                <button
                  onClick={(e) => handleOpenEdit(assetDetail, e)}
                  className="px-3.5 py-2 bg-bg-primary hover:bg-bg-secondary border border-border text-text-primary rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
                >
                  <Edit className="w-3.5 h-3.5 text-text-muted" /> Edit Details
                </button>
              </div>
            </div>
          </div>
        ) : (
          <PageHeading
            title="Asset Inventory"
            description="Manage your external attack surface, website targets, and repositories."
            actions={
              <button 
                onClick={handleOpenAdd}
                className="px-4 py-2 bg-accent hover:bg-accent-dark text-text-primary text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors shadow-sm cursor-pointer"
              >
                <Plus className="w-4 h-4" /> Add Asset
              </button>
            }
          />
        )}

        {/* 1. Statistics Row (Only in List View) */}
        {!selectedAssetId && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-4">
            <Card className="flex items-start justify-between relative overflow-hidden text-left">
              <div className="space-y-3">
                <p className={PagesFontSize.cardTitle}>Total Assets</p>
                <p className="text-3xl font-extrabold text-text-primary font-mono">{isPending ? '--' : totalAssetsCount}</p>
                <p className="text-[10px] text-text-muted font-semibold">Active monitor scope</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-bg-secondary border border-border-warm flex items-center justify-center text-text-muted">
                <Database className="w-5 h-5" />
              </div>
            </Card>

            <Card className="flex items-start justify-between relative overflow-hidden text-left">
              <div className="space-y-3">
                <p className={PagesFontSize.cardTitle}>Healthy Assets</p>
                <p className="text-3xl font-extrabold text-success font-mono">{isPending ? '--' : healthyCount}</p>
                <p className="text-[10px] text-success font-semibold">Excellent or Good posture</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-success-bg border border-border flex items-center justify-center text-success">
                <CheckCircle className="w-5 h-5" />
              </div>
            </Card>

            <Card className="flex items-start justify-between relative overflow-hidden text-left">
              <div className="space-y-3">
                <p className={PagesFontSize.cardTitle}>Critical Posture</p>
                <p className="text-3xl font-extrabold text-danger font-mono">{isPending ? '--' : criticalPostureCount}</p>
                <p className="text-[10px] text-danger font-semibold">Require immediate action</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-danger-bg border border-border flex items-center justify-center text-danger">
                <AlertTriangle className="w-5 h-5" />
              </div>
            </Card>

            <Card className="flex items-start justify-between relative overflow-hidden text-left">
              <div className="space-y-3">
                <p className={PagesFontSize.cardTitle}>Unscanned Targets</p>
                <p className="text-3xl font-extrabold text-warning font-mono">{isPending ? '--' : missingScanCount}</p>
                <p className="text-[10px] text-warning font-semibold flex items-center gap-0.5">Missing recent scan</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-warning-bg border border-border flex items-center justify-center text-warning">
                <Clock className="w-5 h-5" />
              </div>
            </Card>

            <Card className="flex items-start justify-between relative overflow-hidden text-left">
              <div className="space-y-3">
                <p className={PagesFontSize.cardTitle}>Avg Posture</p>
                <p className="text-2xl font-extrabold text-info tracking-tight">{isPending ? '--' : averagePostureValue}</p>
                <p className="text-[10px] text-info font-semibold flex items-center gap-0.5">Calculated state</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-info-bg border border-border flex items-center justify-center text-info">
                <Shield className="w-5 h-5" />
              </div>
            </Card>

            <Card className="flex items-start justify-between relative overflow-hidden text-left">
              <div className="space-y-3">
                <p className={PagesFontSize.cardTitle}>Avg Confidence</p>
                <p className="text-3xl font-extrabold text-text-muted font-mono">{isPending ? '--' : averageConfidence}</p>
                <p className="text-[10px] text-text-muted font-semibold flex items-center gap-0.5">Verification rate</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-bg-secondary border border-border flex items-center justify-center text-text-muted">
                <Zap className="w-5 h-5" />
              </div>
            </Card>

            <Card className="flex items-start justify-between relative overflow-hidden text-left">
              <div className="space-y-3">
                <p className={PagesFontSize.cardTitle}>Avg Coverage</p>
                <p className="text-3xl font-extrabold text-info font-mono">{isPending ? '--' : averageCoverage}</p>
                <p className="text-[10px] text-info font-semibold flex items-center gap-0.5">Scanners coverage</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-info-bg border border-border flex items-center justify-center text-info">
                <Activity className="w-5 h-5" />
              </div>
            </Card>
          </div>
        )}

        {/* 2. Main content block - List View */}
        {!selectedAssetId && (
          <div className="w-full flex flex-col gap-4">
            
            {/* Filter bar */}
            <div className="flex flex-col lg:flex-row justify-between items-stretch lg:items-center gap-3 bg-bg-primary border border-border rounded-2xl p-3 shadow-sm text-xs font-semibold text-text-primary min-h-[46px]">
              
              {/* Left action / selection metadata */}
              {selectedAssetKeys.length > 0 ? (
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 w-full animate-fade-in text-left">
                  <span className="flex items-center gap-2 font-bold text-text-primary">
                    <Database className="w-4 h-4 text-accent" /> {selectedAssetKeys.length} assets selected
                  </span>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={handleBulkScan}
                      className="px-3.5 py-1.5 bg-accent hover:bg-accent-dark text-text-primary rounded-lg flex items-center gap-1 font-bold shadow-sm transition-all cursor-pointer"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" /> Scan Selected
                    </button>
                    <button 
                      onClick={handleBulkDelete}
                      className="px-3.5 py-1.5 bg-danger-bg hover:bg-danger-bg text-danger border border-danger/30 rounded-lg flex items-center gap-1 font-bold shadow-sm transition-all cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Delete Selected
                    </button>
                    <button
                      onClick={() => {
                        const csvContent = "data:text/csv;charset=utf-8,Asset Name,URL,Type,Security Posture,Latest Scan Date\n" + 
                          assetsData.filter(a => selectedAssetKeys.includes(a.id))
                            .map(a => `"${a.name}","${a.url}","${a.type}","${a.security_posture || 'N/A'}","${a.latest_scan_date || 'N/A'}"`)
                            .join("\n");
                        const encodedUri = encodeURI(csvContent);
                        const link = document.createElement("a");
                        link.setAttribute("href", encodedUri);
                        link.setAttribute("download", "cipherlens_assets_export.csv");
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                      }}
                      className="px-3.5 py-1.5 bg-bg-primary hover:bg-bg-secondary border border-border text-text-secondary rounded-lg flex items-center gap-1 font-bold shadow-sm transition-all cursor-pointer"
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5 text-success" /> Export CSV
                    </button>
                    <button 
                      onClick={() => setSelectedAssetKeys([])}
                      className="p-1.5 hover:bg-bg-muted text-text-muted rounded-lg transition-colors cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between w-full gap-3">
                  
                  {/* Left filters */}
                  <div className="flex flex-wrap items-center gap-2">
                    
                    {/* Search box */}
                    <div className="relative flex-1 md:flex-initial min-w-[220px]">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-muted" />
                      <input 
                        type="text"
                        placeholder="Search name, URL, owner..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-8.5 pr-4 py-1.5 bg-bg-secondary border border-border rounded-xl text-xs font-bold text-text-primary placeholder:text-text-muted outline-none hover:border-border-strong focus:border-accent transition-colors"
                      />
                    </div>

                    {/* Type Filter */}
                    <select
                      value={typeFilter}
                      onChange={(e) => setTypeFilter(e.target.value)}
                      className="px-3 py-1.5 bg-bg-secondary border border-border rounded-xl text-xs font-bold text-text-primary cursor-pointer outline-none hover:border-border-strong"
                    >
                      <option value="">All Types</option>
                      <option value="WEBSITE">Website</option>
                      <option value="REPOSITORY">Repository</option>
                      <option value="DOMAIN">Domain</option>
                      <option value="API ENDPOINT">API Endpoint</option>
                    </select>

                    {/* Posture Filter */}
                    <select
                      value={postureFilter}
                      onChange={(e) => setPostureFilter(e.target.value)}
                      className="px-3 py-1.5 bg-bg-secondary border border-border rounded-xl text-xs font-bold text-text-primary cursor-pointer outline-none hover:border-border-strong"
                    >
                      <option value="">All Postures</option>
                      <option value="excellent">Excellent</option>
                      <option value="good">Good</option>
                      <option value="fair">Fair</option>
                      <option value="poor">Poor</option>
                      <option value="critical">Critical</option>
                    </select>

                    {/* Env Filter */}
                    <select
                      value={envFilter}
                      onChange={(e) => setEnvFilter(e.target.value)}
                      className="px-3 py-1.5 bg-bg-secondary border border-border rounded-xl text-xs font-bold text-text-primary cursor-pointer outline-none hover:border-border-strong"
                    >
                      <option value="">All Environments</option>
                      <option value="Production">Production</option>
                      <option value="Staging">Staging</option>
                      <option value="Development">Development</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-2 self-end lg:self-auto">
                    <button
                      onClick={() => refetch()}
                      className="p-2 bg-bg-primary hover:bg-bg-secondary border border-border rounded-xl text-text-muted hover:text-text-primary shadow-sm transition-colors cursor-pointer"
                      title="Sync inventory"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Table Inventory Card */}
            <div className="bg-bg-primary rounded-3xl border border-border shadow-sm overflow-hidden flex flex-col">
              <div className="overflow-x-auto max-h-[580px] overflow-y-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b border-border select-none text-[10px] tracking-wider uppercase font-bold text-text-muted bg-bg-secondary">
                      <th className="py-3 px-6 text-left w-12">
                        <input
                          type="checkbox"
                          checked={paginatedAssets.length > 0 && selectedAssetKeys.length === paginatedAssets.length}
                          onChange={toggleSelectAll}
                          className="rounded border-border-strong text-accent focus:ring-accent w-3.5 h-3.5 cursor-pointer"
                        />
                      </th>
                      <th className="py-3 px-6 text-left">Asset Name & URL</th>
                      <th className="py-3 px-6 text-left">Type</th>
                      <th className="py-3 px-6 text-left">Env</th>
                      <th className="py-3 px-6 text-left">Security Posture</th>
                      <th className="py-3 px-6 text-center">Scan Status</th>
                      <th className="py-3 px-6 text-center">Critical Gaps</th>
                      <th className="py-3 px-6 text-center">Findings</th>
                      <th className="py-3 px-6 text-center">Coverage</th>
                      <th className="py-3 px-6 text-left">Tags</th>
                      <th className="py-3 px-6 text-left">Owner</th>
                      <th className="py-3.5 px-6 text-center w-28">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border text-xs font-semibold text-text-primary">
                    {isPending ? (
                      <tr>
                        <td colSpan={12} className="py-20 text-center font-bold text-text-muted">
                          <div className="flex flex-col items-center justify-center gap-2">
                            <RefreshCw className="w-6 h-6 animate-spin text-accent" />
                            Loading asset records...
                          </div>
                        </td>
                      </tr>
                    ) : paginatedAssets.length === 0 ? (
                      <tr>
                        <td colSpan={12} className="py-24 text-center">
                          <div className="max-w-md mx-auto flex flex-col items-center justify-center gap-4 text-center">
                            <div className="w-14 h-14 rounded-full bg-bg-secondary border border-border-warm flex items-center justify-center text-text-muted">
                              <Database className="w-7 h-7" />
                            </div>
                            <div className="space-y-1">
                              <h3 className="text-sm font-bold text-text-primary">No assets have been added yet</h3>
                              <p className="text-xs text-text-muted leading-relaxed">
                                Assets represent websites, APIs, domains, and other targets that CipherLens monitors. Add your first asset to begin scanning and tracking posture.
                              </p>
                            </div>
                            <button
                              onClick={handleOpenAdd}
                              className="px-4 py-2 bg-accent hover:bg-accent-dark text-text-primary rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer flex items-center gap-1.5"
                            >
                              <Plus className="w-4 h-4" /> Add Asset
                            </button>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      paginatedAssets.map((asset) => {
                        const env = asset.url.includes('staging') ? 'Staging' : asset.url.includes('dev') ? 'Development' : 'Production';
                        const envColor = env === 'Production' ? 'text-text-primary bg-info-bg border-border' : env === 'Staging' ? 'text-text-primary bg-warning-bg border-border' : 'text-text-primary bg-bg-secondary border-border-warm';

                        return (
                          <tr 
                            key={asset.id} 
                            onClick={() => handleRowClick(asset.id)}
                            className="hover:bg-bg-secondary hover:text-text-primary cursor-pointer select-none transition-colors"
                          >
                            <td className="py-3.5 px-6 text-left" onClick={(e) => e.stopPropagation()}>
                              <input
                                type="checkbox"
                                checked={selectedAssetKeys.includes(asset.id)}
                                onChange={(e) => toggleSelectRow(asset.id, e as any)}
                                className="rounded border-border-strong text-accent focus:ring-accent w-3.5 h-3.5 cursor-pointer"
                              />
                            </td>
                            <td className="py-3.5 px-6 text-left max-w-[200px] truncate">
                              <span className="font-extrabold block text-text-primary truncate leading-snug">{asset.name}</span>
                              <span className="text-[10px] text-text-muted block font-semibold truncate leading-none mt-0.5">{asset.url}</span>
                            </td>
                            <td className="py-3.5 px-6 text-left font-bold text-[10px] text-text-muted uppercase">{asset.type}</td>
                            <td className="py-3.5 px-6 text-left">
                              <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold border ${envColor}`}>{env}</span>
                            </td>
                            <td className="py-3.5 px-6 text-left">
                              <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] border font-extrabold uppercase ${getPostureColor(asset.security_posture)}`}>
                                {asset.security_posture || 'Unknown'}
                              </span>
                            </td>
                            <td className="py-3.5 px-6 text-center font-bold text-[10px] uppercase">
                              <span className={`inline-block px-2 py-0.5 rounded-full font-bold border ${
                                asset.latest_scan_status === 'COMPLETED' ? 'text-text-primary bg-success-bg border-border' : 
                                asset.latest_scan_status === 'FAILED' ? 'text-text-primary bg-danger-bg border-border' : 
                                asset.latest_scan_status === 'RUNNING' ? 'text-text-primary bg-info-bg border-border animate-pulse' : 'text-text-primary bg-bg-secondary border-border'
                              }`}>
                                {asset.latest_scan_status || 'Unscanned'}
                              </span>
                            </td>
                            <td className="py-3.5 px-6 text-center font-bold font-mono text-danger">{asset.critical_findings}</td>
                            <td className="py-3.5 px-6 text-center font-bold font-mono">{asset.total_findings}</td>
                            <td className="py-3.5 px-6 text-center font-semibold font-mono text-[11px]">{asset.coverage ? `${asset.coverage}%` : '--'}</td>
                            <td className="py-3.5 px-6 text-left max-w-[130px] truncate">
                              <div className="flex flex-wrap gap-1">
                                {asset.tags && asset.tags.length > 0 ? (
                                  asset.tags.slice(0, 2).map(tag => (
                                    <span key={tag} className="inline-block px-1.5 py-0.5 bg-bg-muted text-text-primary rounded text-[9px] font-bold">{tag}</span>
                                  ))
                                ) : (
                                  <span className="text-[10px] text-text-muted italic">--</span>
                                )}
                              </div>
                            </td>
                            <td className="py-3.5 px-6 text-left text-[11px] text-text-secondary truncate">{asset.owner || '--'}</td>
                            <td className="py-3.5 px-6 text-center" onClick={(e) => e.stopPropagation()}>
                              <div className="relative inline-block text-left">
                                <button
                                  onClick={() => setActiveDropdownAssetId(activeDropdownAssetId === asset.id ? null : asset.id)}
                                  className="p-1.5 hover:bg-border/50 rounded-lg text-text-muted hover:text-text-primary transition-colors cursor-pointer border border-transparent"
                                  title="Actions"
                                >
                                  <MoreVertical className="w-4 h-4" />
                                </button>
                                {activeDropdownAssetId === asset.id && (
                                  <>
                                    <div 
                                      className="fixed inset-0 z-10" 
                                      onClick={() => setActiveDropdownAssetId(null)} 
                                    />
                                    <div className="absolute right-0 mt-1 w-36 bg-bg-primary border border-border rounded-xl shadow-lg z-20 py-1.5 animate-scale-up text-left">
                                      <button
                                        onClick={() => {
                                          setActiveDropdownAssetId(null);
                                          handleScanRedirect(asset);
                                        }}
                                        className="w-full text-left px-3 py-1.5 hover:bg-bg-secondary text-xs font-bold text-text-primary transition-colors cursor-pointer flex items-center gap-1.5"
                                      >
                                        <Play className="w-3 h-3 fill-current text-success" /> Trigger Rescan
                                      </button>
                                      <button
                                        onClick={(e) => {
                                          setActiveDropdownAssetId(null);
                                          handleOpenEdit(asset, e);
                                        }}
                                        className="w-full text-left px-3 py-1.5 hover:bg-bg-secondary text-xs font-bold text-text-primary transition-colors cursor-pointer flex items-center gap-1.5"
                                      >
                                        <Edit className="w-3 h-3 text-text-muted" /> Edit Details
                                      </button>
                                      <button
                                        onClick={() => {
                                          setActiveDropdownAssetId(null);
                                          setDeleteConfirmId(asset.id);
                                        }}
                                        className="w-full text-left px-3 py-1.5 hover:bg-danger-bg text-danger transition-colors cursor-pointer flex items-center gap-1.5 border-t border-border mt-1"
                                      >
                                        <Trash2 className="w-3 h-3" /> De-register
                                      </button>
                                    </div>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Custom pagination footer */}
              {totalPages > 1 && (
                <div className="flex flex-col sm:flex-row justify-between items-center gap-3 px-6 py-3.5 text-xs text-text-muted font-semibold select-none bg-bg-secondary border-t border-border">
                  <p className="font-semibold text-text-muted">
                    Showing <span className="font-bold text-text-primary">{startIndex + 1}</span> to{' '}
                    <span className="font-bold text-text-primary">{Math.min(startIndex + itemsPerPage, totalItems)}</span> of{' '}
                    <span className="font-bold text-text-primary">{totalItems}</span> assets in inventory
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
            </div>
          </div>
        )}

        {/* 3. Detailed View Mode (activated when selectedAssetId is set) */}
        {selectedAssetId && (
          <div className="w-full grid grid-cols-1 xl:grid-cols-4 gap-7">
            
            {/* Sidebar Column: Asset Summary Metadata */}
            <div className="xl:col-span-1 flex flex-col gap-6">
              {detailPending ? (
                <Card className="flex flex-col gap-4 animate-pulse h-[350px]">
                  <div className="h-6 bg-bg-muted rounded w-2/3" />
                  <div className="h-4 bg-bg-muted rounded w-1/2" />
                  <div className="h-20 bg-bg-muted rounded" />
                </Card>
              ) : assetDetail ? (
                <>
                  <Card className="flex flex-col text-left gap-4">
                    <h3 className="text-xs font-extrabold uppercase tracking-wider text-text-muted pb-2 border-b border-border">Asset Details & Info</h3>
                    <div className="space-y-4">
                      <div>
                        <span className="text-[10px] text-text-muted block font-bold uppercase tracking-wider">Business Criticality</span>
                        <span className="text-sm font-extrabold block text-text-primary mt-0.5">{assetDetail.business_criticality}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-text-muted block font-bold uppercase tracking-wider">Environment</span>
                        <span className="text-sm font-extrabold block text-text-primary mt-0.5">{assetDetail.environment}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-text-muted block font-bold uppercase tracking-wider">Registered Owner</span>
                        <span className="text-sm font-extrabold block text-text-primary mt-0.5">{assetDetail.owner || '--'}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-text-muted block font-bold uppercase tracking-wider">Created Timestamp</span>
                        <span className="text-xs font-mono font-bold block text-text-secondary mt-0.5">
                          {new Date(assetDetail.createdAt).toLocaleString()}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-text-muted block font-bold uppercase tracking-wider">Description</span>
                        <p className="text-xs text-text-secondary leading-relaxed font-semibold mt-1">
                          {assetDetail.description || 'No description maintained.'}
                        </p>
                      </div>
                      {assetDetail.tags && assetDetail.tags.length > 0 && (
                        <div>
                          <span className="text-[10px] text-text-muted block font-bold uppercase tracking-wider mb-1.5">Assigned Tags</span>
                          <div className="flex flex-wrap gap-1">
                            {assetDetail.tags.map(t => (
                              <span key={t} className="px-2 py-0.5 bg-bg-secondary border border-border text-text-primary rounded text-[10px] font-bold">{t}</span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </Card>

                  <Card className="flex flex-col text-left gap-4 bg-bg-secondary/40 border border-border">
                    <h3 className="text-xs font-extrabold uppercase tracking-wider text-text-muted pb-2 border-b border-border flex items-center gap-1.5">
                      <Settings className="w-4 h-4 text-accent" /> Asset Actions
                    </h3>
                    <div className="flex flex-col gap-2">
                      <button
                        onClick={() => handleScanRedirect(assetDetail)}
                        className="w-full text-left px-3 py-2 hover:bg-bg-secondary rounded-xl text-xs font-bold text-text-primary transition-all flex items-center gap-2 cursor-pointer"
                      >
                        <Play className="w-3.5 h-3.5 text-success fill-current" /> Trigger Quick Scan
                      </button>
                      {assetDetail.scan_history.length > 0 && (
                        <button
                          onClick={() => navigate(`/scan/${assetDetail.scan_history[0].id}/results`)}
                          className="w-full text-left px-3 py-2 hover:bg-bg-secondary rounded-xl text-xs font-bold text-text-primary transition-all flex items-center gap-2 cursor-pointer"
                        >
                          <FileText className="w-3.5 h-3.5 text-accent" /> View Latest Results
                        </button>
                      )}
                      <button
                        onClick={() => navigate('/findings', { state: { search: assetDetail.name } })}
                        className="w-full text-left px-3 py-2 hover:bg-bg-secondary rounded-xl text-xs font-bold text-text-primary transition-all flex items-center gap-2 cursor-pointer"
                      >
                        <AlertTriangle className="w-3.5 h-3.5 text-text-muted" /> View Findings Summary
                      </button>
                      <button
                        onClick={() => setDeleteConfirmId(assetDetail.id)}
                        className="w-full text-left px-3 py-2 hover:bg-danger-bg text-danger rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer mt-4"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> De-register Asset
                      </button>
                    </div>
                  </Card>
                </>
              ) : null}
            </div>

            {/* Main Tabs Column */}
            <div className="xl:col-span-3 flex flex-col gap-5">
              
              {/* Tab Navigation buttons */}
              <div className="flex flex-wrap items-center gap-1.5 border-b border-border pb-1.5 select-none text-left">
                {[
                  { id: 'overview', label: 'Overview' },
                  { id: 'history', label: 'Scan History' },
                  { id: 'findings', label: 'Findings Summary' },
                  { id: 'tech', label: 'Technology Profile' },
                  { id: 'discovery', label: 'Discovery Inventory' }
                ].map(t => (
                  <button
                    key={t.id}
                    onClick={() => setActiveTab(t.id as any)}
                    className={`px-4 py-2 text-xs font-extrabold rounded-xl transition-all cursor-pointer ${
                      activeTab === t.id 
                        ? 'bg-bg-muted text-text-primary shadow-sm border border-border-strong'
                        : 'text-text-muted hover:bg-bg-secondary hover:text-text-primary'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {detailPending ? (
                <Card className="py-24 text-center font-bold text-text-muted">
                  <div className="flex flex-col items-center justify-center gap-2 animate-pulse">
                    <RefreshCw className="w-7 h-7 animate-spin text-accent" />
                    Fetching detailed attack surface metrics...
                  </div>
                </Card>
              ) : assetDetail ? (
                <>
                  
                  {/* OVERVIEW TAB */}
                  {activeTab === 'overview' && (
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                        <Card className="text-left flex flex-col justify-between">
                          <span className="text-[10px] text-text-muted block font-extrabold uppercase tracking-wider">Security State</span>
                          <span className={`inline-block px-3 py-1 rounded-full text-sm font-extrabold border uppercase mt-2.5 self-start ${getPostureColor(assetDetail.security_posture)}`}>
                            {assetDetail.security_posture || 'Unknown'}
                          </span>
                          <p className="text-[11px] text-text-muted mt-3 font-semibold leading-relaxed">
                            {assetDetail.security_posture === 'Excellent' || assetDetail.security_posture === 'Good' 
                              ? 'This asset exhibits a robust posture with minimal critical threat gaps.' 
                              : 'This asset exposes configurations that require immediate hardening.'}
                          </p>
                        </Card>

                        <Card className="text-left flex flex-col justify-between">
                          <span className="text-[10px] text-text-muted block font-extrabold uppercase tracking-wider">Assessment Confidence</span>
                          <div className="my-2 flex items-baseline gap-1.5">
                            <span className="text-3xl font-extrabold text-text-muted font-mono">{assetDetail.confidence ? `${assetDetail.confidence}%` : '--'}</span>
                            <span className="text-[10px] text-text-muted font-bold uppercase">{assetDetail.confidence && assetDetail.confidence > 80 ? 'HIGH' : 'MEDIUM'}</span>
                          </div>
                          <p className="text-[11px] text-text-muted mt-2 font-semibold">Reliability percentage based on scan validations.</p>
                        </Card>

                        <Card className="text-left flex flex-col justify-between">
                          <span className="text-[10px] text-text-muted block font-extrabold uppercase tracking-wider">Security Coverage</span>
                          <div className="my-2 flex items-baseline gap-1.5">
                            <span className="text-3xl font-extrabold text-info font-mono">{assetDetail.coverage ? `${assetDetail.coverage}%` : '--'}</span>
                            <span className="text-[10px] text-info font-bold uppercase">SECURE</span>
                          </div>
                          <p className="text-[11px] text-text-muted mt-2 font-semibold">Scanners coverage of active security policies.</p>
                        </Card>
                      </div>

                      {/* Timeline Graph Stub / Journey list */}
                      <Card className="text-left space-y-4">
                        <h3 className="text-sm font-extrabold text-text-primary">Security Posture Timeline</h3>
                        <div className="flex items-center gap-2 overflow-x-auto pb-4 pt-2">
                          {assetDetail.scan_history.slice().reverse().map((s, idx) => (
                            <div key={s.id} className="flex items-center gap-2 flex-shrink-0">
                              <div className={`flex flex-col items-center justify-between p-3 rounded-2xl border w-24 h-24 text-center ${
                                s.status === 'COMPLETED' ? 'bg-bg-primary border-border' : 'bg-danger-bg border-border'
                              }`}>
                                <span className="text-[9px] font-extrabold text-text-muted uppercase">Scan {idx + 1}</span>
                                <span className={`text-base font-extrabold font-mono ${
                                  s.status === 'COMPLETED' ? 'text-success' : 'text-danger'
                                }`}>
                                  {s.score !== null ? s.score : '--'}
                                </span>
                                <span className="text-[8px] text-text-muted font-bold">
                                  {new Date(s.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                </span>
                              </div>
                              {idx < assetDetail.scan_history.length - 1 && (
                                <ChevronRight className="w-4 h-4 text-text-muted" />
                              )}
                            </div>
                          ))}
                        </div>
                      </Card>
                    </div>
                  )}

                  {/* SCAN HISTORY TAB */}
                  {activeTab === 'history' && (
                    <Card className="text-left space-y-4 p-0 overflow-hidden">
                      <div className="px-5 py-4 border-b border-border">
                        <h3 className="text-sm font-extrabold text-text-primary">Scan Assessment Trail</h3>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full border-collapse">
                          <thead>
                            <tr className="border-b border-border select-none text-[9px] tracking-wider uppercase font-extrabold text-text-muted bg-bg-secondary">
                              <th className="py-2.5 px-5 text-left">Scan ID</th>
                              <th className="py-2.5 px-5 text-left">Assessed Date</th>
                              <th className="py-2.5 px-5 text-center">Duration</th>
                              <th className="py-2.5 px-5 text-left">Modules executed</th>
                              <th className="py-2.5 px-5 text-center">Threat score</th>
                              <th className="py-2.5 px-5 text-center">Findings count</th>
                              <th className="py-2.5 px-5 text-center">Status</th>
                              <th className="py-2.5 px-5 text-center w-28">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border text-xs font-semibold text-text-primary">
                            {assetDetail.scan_history.map(s => (
                              <tr key={s.id} className="hover:bg-bg-secondary transition-colors">
                                <td className="py-3 px-5 text-left font-mono font-bold text-text-muted truncate max-w-[120px]">{s.id}</td>
                                <td className="py-3 px-5 text-left">{new Date(s.createdAt).toLocaleString()}</td>
                                <td className="py-3 px-5 text-center font-mono">{s.duration ? `${s.duration}s` : '--'}</td>
                                <td className="py-3 px-5 text-left max-w-[200px] truncate">
                                  <span className="text-[10px] text-text-secondary truncate">{s.modules.join(', ')}</span>
                                </td>
                                <td className="py-3 px-5 text-center font-mono font-bold">{s.score !== null ? s.score : '--'}</td>
                                <td className="py-3 px-5 text-center font-mono font-bold text-text-muted">{s.findingsCount}</td>
                                <td className="py-3 px-5 text-center font-bold text-[10px] uppercase">
                                  <span className={`px-2.5 py-0.5 text-[10px] font-bold rounded-full border text-text-primary border-border ${
                                    s.status === 'COMPLETED' ? 'bg-success-bg' : 
                                    s.status === 'FAILED' ? 'bg-danger-bg' : 'bg-bg-secondary'
                                  }`}>
                                    {s.status}
                                  </span>
                                </td>
                                <td className="py-3 px-5 text-center">
                                  <button
                                    onClick={() => navigate(`/scan/${s.id}/results`)}
                                    className="px-2 py-1 bg-bg-primary hover:bg-bg-secondary border border-border text-[10px] font-extrabold text-accent rounded-lg flex items-center gap-0.5 transition-all mx-auto cursor-pointer"
                                  >
                                    Results <ExternalLink className="w-2.5 h-2.5" />
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </Card>
                  )}

                  {/* FINDINGS SUMMARY TAB */}
                  {activeTab === 'findings' && (
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
                        <Card className="text-center p-4">
                          <span className="text-[10px] text-text-muted block font-extrabold uppercase tracking-wider">Critical Findings</span>
                          <span className="text-3xl font-extrabold text-danger block mt-2 font-mono">{assetDetail.findings_summary.critical}</span>
                        </Card>
                        <Card className="text-center p-4">
                          <span className="text-[10px] text-text-muted block font-extrabold uppercase tracking-wider">High Findings</span>
                          <span className="text-3xl font-extrabold text-warning block mt-2 font-mono">{assetDetail.findings_summary.high}</span>
                        </Card>
                        <Card className="text-center p-4">
                          <span className="text-[10px] text-text-muted block font-extrabold uppercase tracking-wider">Medium Findings</span>
                          <span className="text-3xl font-extrabold text-warning block mt-2 font-mono">{assetDetail.findings_summary.medium}</span>
                        </Card>
                        <Card className="text-center p-4">
                          <span className="text-[10px] text-text-muted block font-extrabold uppercase tracking-wider">Total Open Findings</span>
                          <span className="text-3xl font-extrabold text-text-primary block mt-2 font-mono">{assetDetail.open_findings}</span>
                        </Card>
                      </div>

                      <Card className="text-left space-y-4">
                        <div className="flex justify-between items-center pb-2 border-b border-border">
                          <h3 className="text-sm font-extrabold text-text-primary">Findings Aggregated Metrics</h3>
                          <div className="flex gap-4 text-xs font-extrabold">
                            <span className="text-danger">New Findings: {assetDetail.new_findings}</span>
                            <span className="text-success">Resolved: {assetDetail.resolved_findings}</span>
                          </div>
                        </div>
                        <p className="text-xs text-text-secondary leading-relaxed font-semibold">
                          Click on the findings menu items or Scans History to inspect complete remediation details and proof of evidence on the dedicated Results page.
                        </p>
                      </Card>
                    </div>
                  )}

                  {/* TECHNOLOGY TAB */}
                  {activeTab === 'tech' && (
                    <Card className="text-left space-y-5">
                      <div className="border-b border-border pb-2">
                        <h3 className="text-sm font-extrabold text-text-primary">Technology Stack Fingerprint</h3>
                        <p className="text-xs text-text-muted font-semibold mt-0.5">Automatically discovered framework stack powering {assetDetail.name}.</p>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        {assetDetail.tech_fingerprint.map(t => {
                          const logoUrl = getTechLogo(t);
                          return (
                            <div key={t} className="flex items-center gap-3 p-4 bg-bg-primary border border-border rounded-2xl shadow-xs">
                              {logoUrl ? (
                                <img src={logoUrl} className="object-contain flex-shrink-0" style={{ width: '40px', height: '40px' }} alt={t} />
                              ) : (
                                <span className="rounded-xl bg-bg-secondary border border-border text-text-muted flex items-center justify-center text-xs font-extrabold flex-shrink-0" style={{ width: '40px', height: '40px' }}>
                                  {t.charAt(0).toUpperCase()}
                                </span>
                              )}
                              <div className="min-w-0">
                                <span className="font-extrabold block text-text-primary text-xs truncate" title={t}>{t}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </Card>
                  )}

                  {/* DISCOVERY TAB */}
                  {activeTab === 'discovery' && (
                    <div className="space-y-6">
                      
                      {/* DNS Records Table */}
                      <Card className="text-left space-y-4">
                        <div className="border-b border-border pb-2">
                          <h3 className="text-sm font-extrabold text-text-primary">DNS Records Information</h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="p-3.5 bg-bg-primary border border-border rounded-2xl">
                            <span className="text-[10px] text-text-muted font-extrabold uppercase block mb-1">SPF Policy</span>
                            <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold border ${
                              assetDetail.dns_info.SPF === 'Secure' ? 'bg-success-bg text-text-primary border-border' : 'bg-danger-bg text-text-primary border-border'
                            }`}>{assetDetail.dns_info.SPF}</span>
                          </div>
                          <div className="p-3.5 bg-bg-primary border border-border rounded-2xl">
                            <span className="text-[10px] text-text-muted font-extrabold uppercase block mb-1">DMARC Policy</span>
                            <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold border ${
                              assetDetail.dns_info.DMARC === 'Secure' ? 'bg-success-bg text-text-primary border-border' : 'bg-danger-bg text-text-primary border-border'
                            }`}>{assetDetail.dns_info.DMARC}</span>
                          </div>
                          <div className="p-3.5 bg-bg-primary border border-border rounded-2xl">
                            <span className="text-[10px] text-text-muted font-extrabold uppercase block mb-1">A Address Record</span>
                            <span className="font-mono text-xs text-text-primary block font-bold mt-1">
                              {assetDetail.dns_info.A && assetDetail.dns_info.A.length > 0 ? assetDetail.dns_info.A[0] : 'N/A'}
                            </span>
                          </div>
                        </div>
                      </Card>

                      {/* SSL Cert & Security Headers */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        
                        {/* Certificate details */}
                        <Card className="text-left space-y-4">
                          <div className="border-b border-border pb-2 flex items-center gap-1.5">
                            <Lock className="w-4 h-4 text-success" />
                            <h3 className="text-sm font-extrabold text-text-primary">Certificate Status</h3>
                          </div>
                          <div className="space-y-3 font-semibold text-xs">
                            <div className="flex justify-between">
                              <span className="text-text-muted">Issuer</span>
                              <span className="font-bold">{assetDetail.certificate.issuer}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-text-muted">TLS Version</span>
                              <span className="font-bold font-mono">{assetDetail.certificate.tls_version}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-text-muted">Days Remaining</span>
                              <span className="font-extrabold text-success">
                                {assetDetail.certificate.days_remaining !== null ? `${assetDetail.certificate.days_remaining} Days` : 'N/A'}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-text-muted">Expiration Date</span>
                              <span className="font-bold font-mono">{assetDetail.certificate.expiration ? new Date(assetDetail.certificate.expiration).toLocaleDateString() : 'N/A'}</span>
                            </div>
                          </div>
                        </Card>

                        {/* Security Headers */}
                        <Card className="text-left space-y-4">
                          <div className="border-b border-border pb-2 flex items-center gap-1.5">
                            <Globe className="w-4 h-4 text-accent" />
                            <h3 className="text-sm font-extrabold text-text-primary">HTTP Security Headers</h3>
                          </div>
                          <div className="space-y-3 font-semibold text-xs">
                            {Object.entries(assetDetail.security_headers).map(([k, v]) => (
                              <div key={k} className="flex justify-between items-center">
                                <span className="text-text-muted font-bold font-mono text-[10px]">{k}</span>
                                <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold border ${
                                  v === 'Secure' ? 'bg-success-bg text-text-primary border-border' : 'bg-danger-bg text-text-primary border-border'
                                }`}>{v}</span>
                              </div>
                            ))}
                          </div>
                        </Card>
                      </div>

                      {/* Exposed Ports */}
                      <Card className="text-left space-y-4">
                        <div className="border-b border-border pb-2 flex items-center gap-1.5">
                          <Network className="w-4 h-4 text-info" />
                          <h3 className="text-sm font-extrabold text-text-primary">Exposed Network Ports</h3>
                        </div>
                        <div className="flex flex-wrap gap-2.5">
                          {assetDetail.open_ports.length > 0 ? (
                            assetDetail.open_ports.map(port => {
                              const srv = port === 22 ? 'SSH' : port === 80 ? 'HTTP' : port === 443 ? 'HTTPS' : 'unknown';
                              return (
                                <div key={port} className="px-3.5 py-2 bg-bg-primary border border-border rounded-xl flex items-center gap-2">
                                  <span className="font-extrabold font-mono text-xs text-text-primary">{port}</span>
                                  <span className="text-[9px] font-extrabold uppercase bg-bg-muted text-text-muted px-1.5 py-0.5 rounded">{srv}</span>
                                </div>
                              );
                            })
                          ) : (
                            <div className="flex items-center gap-1.5 text-xs text-success font-bold p-1 bg-success-bg/50 border border-success/30 rounded-xl px-3 py-1.5">
                              <CheckCircle className="w-4 h-4" /> No high-risk open ports exposed.
                            </div>
                          )}
                        </div>
                      </Card>

                    </div>
                  )}

                </>
              ) : null}
            </div>

          </div>
        )}

      </div>

      {/* 4. ADD & EDIT ASSET MODAL (Clean styling matching NewScanModal) */}
      {isAddEditOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in p-4">
          <div className="bg-bg-primary border border-border rounded-3xl w-full max-w-lg shadow-xl overflow-hidden text-left flex flex-col animate-scale-up">
            <div className="p-6 border-b border-border flex items-center justify-between bg-bg-primary flex-shrink-0">
              <h3 className="text-sm font-bold text-text-primary flex items-center gap-2">
                <Settings className="w-4 h-4 text-text-muted" />
                {assetToEdit ? `Edit Target Details` : `Register New Target Asset`}
              </h3>
              <button 
                onClick={() => setIsAddEditOpen(false)}
                className="text-text-muted hover:text-text-primary transition-colors cursor-pointer w-8 h-8 rounded-full border border-border flex items-center justify-center text-sm"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleSaveAsset} className="bg-bg-primary p-6 space-y-6">
              
              <div className="bg-bg-primary border border-border rounded-2xl p-6 space-y-4 shadow-sm">
                <div className="space-y-1.5">
                  <label className="block text-body-xs font-bold text-text-secondary uppercase tracking-wider">Asset Target Name</label>
                  <input 
                    type="text"
                    placeholder="e.g. Acme Staging Portal"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-2 border border-border-warm rounded-xl bg-bg-primary text-body-sm placeholder:text-text-muted focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 shadow-sm transition-all"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-body-xs font-bold text-text-secondary uppercase tracking-wider">Asset URL or Git Repository</label>
                  <input 
                    type="text"
                    placeholder="e.g. https://atelier-staging.zeraynce.com/"
                    value={formData.url}
                    onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                    className="w-full px-4 py-2 border border-border-warm rounded-xl bg-bg-primary text-body-sm placeholder:text-text-muted focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 shadow-sm transition-all"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="block text-body-xs font-bold text-text-secondary uppercase tracking-wider">Asset Type</label>
                    <select
                      value={formData.type}
                      onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                      className="w-full px-4 py-2 border border-border-warm rounded-xl bg-bg-primary text-body-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 shadow-sm cursor-pointer transition-all"
                    >
                      <option value="WEBSITE">Website</option>
                      <option value="REPOSITORY">Git Repository</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-body-xs font-bold text-text-secondary uppercase tracking-wider">Environment</label>
                    <select
                      value={formData.environment}
                      onChange={(e) => setFormData({ ...formData, environment: e.target.value })}
                      className="w-full px-4 py-2 border border-border-warm rounded-xl bg-bg-primary text-body-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 shadow-sm cursor-pointer transition-all"
                    >
                      <option value="Production">Production</option>
                      <option value="Staging">Staging</option>
                      <option value="Development">Development</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-body-xs font-bold text-text-secondary uppercase tracking-wider">Assigned Tags (comma-separated)</label>
                  <input 
                    type="text"
                    placeholder="e.g. production, external-facing, core"
                    value={formData.tags}
                    onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                    className="w-full px-4 py-2 border border-border-warm rounded-xl bg-bg-primary text-body-sm placeholder:text-text-muted focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 shadow-sm transition-all"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-body-xs font-bold text-text-secondary uppercase tracking-wider">Asset Description</label>
                  <textarea 
                    placeholder="Describe what this target represents..."
                    rows={3}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-4 py-2 border border-border-warm rounded-xl bg-bg-primary text-body-sm placeholder:text-text-muted focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 shadow-sm resize-none transition-all"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-5 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsAddEditOpen(false)}
                  className="border border-border bg-bg-primary hover:bg-bg-secondary text-text-secondary px-6 py-2.5 rounded-xl text-xs font-bold min-w-[110px] text-center cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createAssetMutation.isPending || editAssetMutation.isPending}
                  className="bg-blue-600 hover:bg-blue-700 text-text-primary px-6 py-2.5 rounded-xl text-xs font-bold min-w-[130px] text-center cursor-pointer shadow-sm transition-colors"
                >
                  {createAssetMutation.isPending || editAssetMutation.isPending ? 'Saving...' : (assetToEdit ? 'Save Changes' : 'Register Asset')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. RESCAN CONFIGURATION REDIRECTION DIALOG */}
      {scanRedirectAsset && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in p-4">
          <div className="bg-bg-primary border border-border rounded-3xl w-full max-w-md shadow-xl overflow-hidden text-left flex flex-col animate-scale-up">
            <div className="p-6 border-b border-border flex items-center justify-between bg-bg-primary flex-shrink-0">
              <h3 className="text-sm font-bold text-text-primary flex items-center gap-2">
                <Play className="w-4 h-4 text-success fill-current" />
                Configure New Scan
              </h3>
              <button 
                onClick={() => setScanRedirectAsset(null)}
                className="text-text-muted hover:text-text-primary transition-colors cursor-pointer w-8 h-8 rounded-full border border-border flex items-center justify-center text-sm"
              >
                ✕
              </button>
            </div>
            <div className="bg-bg-primary p-6 space-y-6">
              <div className="bg-bg-primary border border-border rounded-2xl p-6 shadow-sm">
                <p className="text-xs text-text-secondary leading-relaxed font-semibold">
                  You are about to launch a scan for <span className="font-extrabold text-text-primary">{scanRedirectAsset.name}</span>. 
                  <br /><br />
                  To allow you to select specific modules, crawling options, and custom scopes, you will be redirected to the Scans page. The "New Scan" modal will open automatically with this asset's details pre-populated.
                </p>
              </div>
              <div className="flex items-center justify-end gap-3 pt-5 border-t border-border">
                <button
                  onClick={() => setScanRedirectAsset(null)}
                  className="border border-border bg-bg-primary hover:bg-bg-secondary text-text-secondary px-6 py-2.5 rounded-xl text-xs font-bold min-w-[110px] text-center cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={executeScanRedirect}
                  className="bg-blue-600 hover:bg-blue-700 text-text-primary px-6 py-2.5 rounded-xl text-xs font-bold min-w-[140px] text-center cursor-pointer shadow-sm transition-colors flex items-center justify-center gap-1.5"
                >
                  Proceed to Scans
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 6. DELETE DE-REGISTER CONFIRMATION MODAL */}
      {deleteConfirmId && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in p-4">
          <div className="bg-bg-primary border border-border rounded-3xl w-full max-w-md shadow-xl overflow-hidden text-left flex flex-col animate-scale-up">
            <div className="p-6 border-b border-border flex items-center justify-between bg-bg-primary flex-shrink-0">
              <h3 className="text-sm font-bold text-text-primary flex items-center gap-2">
                <Trash2 className="w-4 h-4 text-danger" />
                De-register Target Asset
              </h3>
              <button 
                onClick={() => setDeleteConfirmId(null)}
                className="text-text-muted hover:text-text-primary transition-colors cursor-pointer w-8 h-8 rounded-full border border-border flex items-center justify-center text-sm"
              >
                ✕
              </button>
            </div>
            <div className="bg-bg-primary p-6 space-y-6">
              <div className="bg-bg-primary border border-border rounded-2xl p-6 shadow-sm">
                <p className="text-xs text-text-secondary leading-relaxed font-semibold">
                  Are you sure you want to de-register this asset? 
                  <br /><br />
                  This action will permanently remove the asset and all associated scanning history, vulnerability diffs, and findings statistics from your dashboard. This action cannot be undone.
                </p>
              </div>
              <div className="flex items-center justify-end gap-3 pt-5 border-t border-border">
                <button
                  onClick={() => setDeleteConfirmId(null)}
                  className="border border-border bg-bg-primary hover:bg-bg-secondary text-text-secondary px-6 py-2.5 rounded-xl text-xs font-bold min-w-[110px] text-center cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteConfirmClick}
                  disabled={deleteAssetMutation.isPending}
                  className="bg-red-600 hover:bg-red-700 text-text-primary px-6 py-2.5 rounded-xl text-xs font-bold min-w-[150px] text-center cursor-pointer shadow-sm transition-colors"
                >
                  {deleteAssetMutation.isPending ? 'De-registering...' : 'De-register Asset'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
