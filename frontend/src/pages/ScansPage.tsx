import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import DashboardLayout from '../components/DashboardLayout';
import NewScanModal from '../components/NewScanModal';
import { useScans, useScanSummary, useDeleteScan, useCancelScan, useRetryScan, type ScanCreateParams, type ScanRecord } from '../hooks/useScans';
import ConfirmationDialog from '../components/ConfirmationDialog';
import ProgressModal from '../components/ProgressModal';
import QueueDetailsModal from '../components/QueueDetailsModal';
import ErrorModal from '../components/ErrorModal';
import EmptyState from '../components/EmptyState';
import ScanActionMenu from '../components/ScanActionMenu';
import PageHeading from '../components/PageHeading';
import Card from '../components/Card';
import { LoadingScreen } from '../components/LoadingScreen';
import { PagesFontSize } from '../components/PagesFontSize';

export default function ScansPage() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (location.state && (location.state as any).openNewScan) {
      const stateObj = location.state as any;
      if (stateObj.initialConfig) {
        setDuplicateConfig(stateObj.initialConfig);
      }
      setIsNewScanOpen(true);
      // Clear location state so modal doesn't re-open on manual page reloads
      window.history.replaceState({}, document.title);
    }
  }, [location]);

  // UI State
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage] = useState(10);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [assetType, setAssetType] = useState('');
  const [scanType, setScanType] = useState('');
  const [status, setStatus] = useState('');
  const [isNewScanOpen, setIsNewScanOpen] = useState(false);

  // Modal actions states
  const [selectedScanId, setSelectedScanId] = useState<string | null>(null);
  const [activeModal, setActiveModal] = useState<'PROGRESS' | 'QUEUE_DETAILS' | 'ERROR' | 'CANCEL_CONFIRM' | 'DELETE_CONFIRM' | 'RETRY_CONFIRM' | null>(null);
  const [duplicateConfig, setDuplicateConfig] = useState<ScanCreateParams | null>(null);

  // Debounce search input
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
      setCurrentPage(1);
    }, 400);

    return () => clearTimeout(handler);
  }, [search]);

  // React Query Hooks
  const { data: summaryData, isPending: summaryPending, error: summaryError, refetch: refetchSummary } = useScanSummary();
  const { data: scansData, isPending: scansPending, error: scansError, refetch: refetchScans } = useScans({
    page: currentPage,
    limit: perPage,
    status,
    scanType,
    assetType,
    search: debouncedSearch,
  });

  const deleteScanMutation = useDeleteScan();
  const cancelScanMutation = useCancelScan();
  const retryScanMutation = useRetryScan();

  const loading = summaryPending || scansPending;
  const error = summaryError?.message || scansError?.message || null;
  const summary = summaryData || null;
  const scans = scansData?.data || [];
  const totalScans = scansData?.total || 0;
  const lastPage = scansData?.last_page || 1;

  const fetchData = () => {
    refetchSummary();
    refetchScans();
  };

  const handleScanAction = (
    scan: ScanRecord,
    action: 'CANCEL' | 'DELETE' | 'RETRY' | 'DUPLICATE' | 'VIEW_PROGRESS' | 'VIEW_ERROR' | 'VIEW_DETAILS' | 'VIEW_RESULTS'
  ) => {
    setSelectedScanId(scan.id);

    switch (action) {
      case 'CANCEL':
        setActiveModal('CANCEL_CONFIRM');
        break;
      case 'DELETE':
        setActiveModal('DELETE_CONFIRM');
        break;
      case 'RETRY':
        setActiveModal('RETRY_CONFIRM');
        break;
      case 'DUPLICATE':
        setDuplicateConfig({
          targetUrl: scan.target.url,
          targetType: scan.target.type,
          scanType: scan.scanType,
          scanName: `${scan.target.name} - Duplicate Scan`,
          scanTags: scan.scanTags || undefined
        });
        setIsNewScanOpen(true);
        break;
      case 'VIEW_PROGRESS':
      case 'VIEW_DETAILS':
        navigate(`/scan/${scan.id}/progress`);
        break;
      case 'VIEW_ERROR':
        setActiveModal('ERROR');
        break;
      case 'VIEW_RESULTS':
        navigate(`/scan/${scan.id}/results`);
        break;
    }
  };

  const handleCancelConfirm = () => {
    if (selectedScanId) {
      cancelScanMutation.mutate(selectedScanId);
    }
    setActiveModal(null);
  };

  const handleDeleteConfirm = () => {
    if (selectedScanId) {
      deleteScanMutation.mutate(selectedScanId);
    }
    setActiveModal(null);
  };

  const handleRetryConfirm = () => {
    if (selectedScanId) {
      retryScanMutation.mutate(selectedScanId);
    }
    setActiveModal(null);
  };

  const openNewScanTodo = () => {
    setDuplicateConfig(null);
    setIsNewScanOpen(true);
  };

  const openImportTargetTodo = () => {
    alert('TODO: Launch Import Target Asset Wizard.');
  };

  // Helper formatting utils
  const formatDuration = (seconds: number | null) => {
    if (seconds === null) return '--';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return m > 0 ? `${m}m ${s}s` : `${s}s`;
  };

  const formatDate = (isoString: string) => {
    const d = new Date(isoString);
    const dateFormatted = d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
    const timeFormatted = d.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
    return { dateFormatted, timeFormatted };
  };




  return (
    <DashboardLayout activePage="Scans">
      <div className="py-8 px-10 space-y-7 w-full">
        
        {/* Main Title Row */}
        <PageHeading
          title="Scans"
          description="View and manage your website, API, and repository security scans."
          actions={
            <>
              {/* Import Target Button */}
              <button
                onClick={openImportTargetTodo}
                className="px-4 py-2 text-xs font-semibold rounded-xl flex items-center gap-2 transition-all cursor-pointer"
                style={{
                  backgroundColor: 'var(--color-bg-secondary)',
                  border: '1px solid var(--color-border)',
                  color: 'var(--color-text-secondary)',
                  fontFamily: 'var(--font-body)'
                }}
                onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--color-hover)')}
                onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'var(--color-bg-secondary)')}
              >
                <svg className="w-4 h-4" style={{ color: 'var(--color-text-muted)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                </svg>
                Import Target
              </button>

              {/* New Scan Button */}
              <button
                onClick={openNewScanTodo}
                className="px-4 py-2 bg-accent hover:bg-accent-dark text-xs font-semibold text-white rounded-xl flex items-center gap-2 transition-colors shadow-sm cursor-pointer"
                style={{ fontFamily: 'var(--font-body)' }}
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
                New Scan
                <svg className="w-3 h-3 opacity-75" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                </svg>
              </button>
            </>
          }
        />

        {/* Statistics summary row */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {/* Total */}
          <Card className="flex items-start justify-between relative overflow-hidden">
            <div className="space-y-3">
              <p className={PagesFontSize.cardTitle}>Total Scans</p>
              <div className="flex items-baseline gap-2">
                <p className="text-3xl font-bold text-text-primary font-mono">{summary ? summary.total : '--'}</p>
              </div>
              <p className="text-body-sm text-success font-semibold flex items-center gap-0.5">
                <span>↑</span> 18 this month
              </p>
            </div>
            {/* Custom pulse SVG */}
            <div className="w-10 h-10 rounded-full bg-info-bg text-info flex items-center justify-center border border-border flex-shrink-0">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 12h3l3.5-7.5L13.5 19 17 12h3" />
              </svg>
            </div>
          </Card>

          {/* Completed */}
          <Card className="flex items-start justify-between relative overflow-hidden">
            <div className="space-y-3">
              <p className={PagesFontSize.cardTitle}>Completed</p>
              <div className="flex items-center gap-2">
                <p className="text-3xl font-bold text-text-primary font-mono">{summary ? summary.completed : '--'}</p>
                {summary && (
                  <span className="text-body-xs font-medium font-bold text-text-primary bg-success-bg px-1.5 py-0.5 rounded border border-border">
                    {((summary.completed / (summary.total || 1)) * 100).toFixed(1)}%
                  </span>
                )}
              </div>
              <p className="text-body-sm text-success font-semibold flex items-center gap-0.5">
                <span>↑</span> 12 this month
              </p>
            </div>
            {/* Custom check SVG */}
            <div className="w-10 h-10 rounded-full bg-success-bg text-success flex items-center justify-center border border-border flex-shrink-0">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
            </div>
          </Card>

          {/* Running */}
          <Card className="flex items-start justify-between relative overflow-hidden">
            <div className="space-y-3">
              <p className={PagesFontSize.cardTitle}>Running</p>
              <div className="flex items-center gap-2">
                <p className="text-3xl font-bold text-text-primary font-mono">{summary ? summary.running : '--'}</p>
                {summary && (
                  <span className="text-body-xs font-medium font-bold text-text-primary bg-warning-bg px-1.5 py-0.5 rounded border border-border">
                    {((summary.running / (summary.total || 1)) * 100).toFixed(1)}%
                  </span>
                )}
              </div>
              <p className="text-body-sm text-danger font-semibold flex items-center gap-0.5">
                <span>↓</span> 2 this month
              </p>
            </div>
            {/* Custom clock SVG */}
            <div className="w-10 h-10 rounded-full bg-warning-bg text-warning flex items-center justify-center border border-border flex-shrink-0">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </Card>

          {/* Queued */}
          <Card className="flex items-start justify-between relative overflow-hidden">
            <div className="space-y-3">
              <p className={PagesFontSize.cardTitle}>Queued</p>
              <div className="flex items-center gap-2">
                <p className="text-3xl font-bold text-text-primary font-mono">{summary ? summary.queued : '--'}</p>
                {summary && (
                  <span className="text-body-xs font-medium font-bold text-text-primary bg-bg-secondary px-1.5 py-0.5 rounded border border-border">
                    {((summary.queued / (summary.total || 1)) * 100).toFixed(1)}%
                  </span>
                )}
              </div>
              <p className="text-body-sm text-success font-semibold flex items-center gap-0.5">
                <span>↑</span> 1 this month
              </p>
            </div>
            {/* Custom hourglass SVG */}
            <div className="w-10 h-10 rounded-full bg-bg-secondary text-text-primary flex items-center justify-center border border-border flex-shrink-0">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6M12 12H12.01M6 20v-2a6 6 0 016-6 6 6 0 016 6v2M6 4V4.01M18 4V4.01M6 4h12M6 20h12M12 12a6 6 0 01-6-6V4h12v2a6 6 0 01-6 6z" />
              </svg>
            </div>
          </Card>

          {/* Failed */}
          <Card className="flex items-start justify-between relative overflow-hidden">
            <div className="space-y-3">
              <p className={PagesFontSize.cardTitle}>Failed</p>
              <div className="flex items-center gap-2">
                <p className="text-3xl font-bold text-text-primary font-mono">{summary ? summary.failed : '--'}</p>
                {summary && (
                  <span className="text-body-xs font-medium font-bold text-text-primary bg-danger-bg px-1.5 py-0.5 rounded border border-border">
                    {((summary.failed / (summary.total || 1)) * 100).toFixed(1)}%
                  </span>
                )}
              </div>
              <p className="text-body-sm text-danger font-semibold flex items-center gap-0.5">
                <span>↓</span> 3 this month
              </p>
            </div>
            {/* Custom 'X' SVG */}
            <div className="w-10 h-10 rounded-full bg-danger-bg text-danger flex items-center justify-center border border-border flex-shrink-0">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
          </Card>
        </div>

        {/* Search, Filter bar */}
        <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center w-full">
          {/* Search Scans input */}
          <div className="relative flex-1">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none">
              <svg className="w-3.5 h-3.5" style={{ color: '#B8A898' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.602 10.602z" />
              </svg>
            </span>
            <input
              type="text"
              placeholder="Search scans..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl text-xs focus:outline-none transition-all"
              style={{
                backgroundColor: 'var(--color-bg-secondary)',
                border: '1px solid var(--color-border)',
                color: 'var(--color-text-primary)',
                fontFamily: 'var(--font-body)'
              }}
            />
          </div>

          {/* Asset Type Select */}
          <div className="relative">
            <select
              value={assetType}
              onChange={(e) => { setAssetType(e.target.value); setCurrentPage(1); }}
              className="pl-3 pr-8 py-2 rounded-xl text-xs font-semibold cursor-pointer focus:outline-none appearance-none"
              style={{ backgroundColor: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)', fontFamily: 'var(--font-body)' }}
            >
              <option value="">All Assets</option>
              <option value="website">Websites</option>
              <option value="repository">Repositories</option>
            </select>
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-body-xs pointer-events-none" style={{ color: '#A89880' }}>▼</span>
          </div>

          {/* Scan Type Select */}
          <div className="relative">
            <select
              value={scanType}
              onChange={(e) => { setScanType(e.target.value); setCurrentPage(1); }}
              className="pl-3 pr-8 py-2 rounded-xl text-xs font-semibold cursor-pointer focus:outline-none appearance-none"
              style={{ backgroundColor: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)', fontFamily: 'var(--font-body)' }}
            >
              <option value="">All Scan Types</option>
              <option value="quick">Quick Scan</option>
              <option value="ssl">SSL Scan</option>
              <option value="owasp">OWASP Scan</option>
              <option value="deep">Deep Scan</option>
              <option value="repository">Repository Scan</option>
              <option value="api_security">API Security Scan</option>
            </select>
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-body-xs pointer-events-none" style={{ color: '#A89880' }}>▼</span>
          </div>

          {/* Status Select */}
          <div className="relative">
            <select
              value={status}
              onChange={(e) => { setStatus(e.target.value); setCurrentPage(1); }}
              className="pl-3 pr-8 py-2 rounded-xl text-xs font-semibold cursor-pointer focus:outline-none appearance-none"
              style={{ backgroundColor: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)', fontFamily: 'var(--font-body)' }}
            >
              <option value="">All Statuses</option>
              <option value="completed">Completed</option>
              <option value="running">Running</option>
              <option value="queued">Queued</option>
              <option value="failed">Failed</option>
              <option value="cancelled">Cancelled</option>
            </select>
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-body-xs pointer-events-none" style={{ color: '#A89880' }}>▼</span>
          </div>

          {/* Date range display — dynamic label */}
          <div className="px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 select-none"
            style={{ backgroundColor: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', color: 'var(--color-text-secondary)' }}>
            <svg className="w-3.5 h-3.5" style={{ color: 'var(--color-text-muted)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
            </svg>
            <span>All time</span>
          </div>

          {/* Advanced Filters Button */}
          <button
            onClick={() => alert('TODO: Toggle advanced filters drawer.')}
            className="px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer"
            style={{ backgroundColor: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', color: 'var(--color-text-secondary)', fontFamily: 'var(--font-body)' }}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--color-hover)')}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'var(--color-bg-secondary)')}
          >
            <svg className="w-4 h-4" style={{ color: 'var(--color-text-muted)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
            </svg>
            Filters
          </button>

          {/* Reset Filters button */}
          {(search || assetType || scanType || status) && (
            <button
              onClick={() => {
                setSearch('');
                setAssetType('');
                setScanType('');
                setStatus('');
                setCurrentPage(1);
              }}
              className="px-3 py-2 text-xs font-semibold text-accent hover:text-accent-dark transition-colors cursor-pointer"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              Clear
            </button>
          )}
        </div>

        {/* Error Banner */}
        {error && (
          <div className="p-4 rounded-xl border border-danger/30 bg-danger-bg text-xs text-danger flex items-start justify-between gap-3" style={{ fontFamily: 'var(--font-body)' }}>
            <div className="flex items-center gap-2">
              <span className="text-base">⚠️</span>
              <span>{error}</span>
            </div>
            <button onClick={fetchData} className="px-3 py-1 font-bold rounded bg-danger-bg hover:bg-red-200 transition-colors cursor-pointer">
              Retry
            </button>
          </div>
        )}

        {/* Listing Block */}
        {loading ? (
          <LoadingScreen fullPage={false} title="Loading Scans..." subtitle="Fetching active assessments from CipherLens..." />
        ) : scans.length === 0 ? (
          /* Reusable Empty State component rendering conditional states */
          search ? (
            <EmptyState
              icon={
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              }
              title="No search results"
              description={`We couldn't find any scans matching "${search}". Try checking for spelling errors or search for another target name.`}
              actionLabel="Clear Search"
              onAction={() => { setSearch(''); setDebouncedSearch(''); }}
            />
          ) : status ? (
            <EmptyState
              icon={
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m0-12.728l.707.707m12.728 12.728l.707-.707" />
                </svg>
              }
              title={`No ${status} scans`}
              description={`There are currently no scans categorized under the "${status.toUpperCase()}" execution status.`}
              actionLabel="Reset Status Filter"
              onAction={() => setStatus('')}
            />
          ) : (assetType || scanType) ? (
            <EmptyState
              icon={
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                </svg>
              }
              title="No filtered results"
              description="There are no security scan target configurations matching your active search filters."
              actionLabel="Clear All Filters"
              onAction={() => { setAssetType(''); setScanType(''); setStatus(''); }}
            />
          ) : (
            <EmptyState
              icon={
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              }
              title="No scans registered"
              description="You have not created any security scans for this workspace. Register a website target or git repository to perform audits."
              actionLabel="Start New Scan"
              onAction={openNewScanTodo}
            />
          )
        ) : (
          /* Scans Grid List */
          <div className="w-full">
            {/* Table Headers sitting directly on page background */}
            <div className="grid grid-cols-12 gap-4 px-6 py-3 font-bold uppercase tracking-wider text-body-sm select-none"
              style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-body)' }}>
              <div className="col-span-4">Target</div>
              <div className="col-span-2">Scan Type</div>
              <div className="col-span-2">Status</div>
              <div className="col-span-2">Started At</div>
              <div className="col-span-1">Duration</div>
              <div className="col-span-1 text-right">Actions</div>
            </div>

            {/* Table Body rows enclosed in a clean white rounded-3xl container */}
            <div className="rounded-3xl overflow-hidden divide-y divide-divider"
              style={{ backgroundColor: 'var(--color-bg-primary)', border: '1px solid var(--color-border)', boxShadow: '0 1px 4px 0 rgba(60,40,10,0.05)' }}>
              {scans.map((scan) => {
                const { dateFormatted, timeFormatted } = formatDate(scan.createdAt);
                
                // Format type display
                let assetTypeLabel = 'Website';
                if (scan.target.type === 'REPOSITORY') {
                  assetTypeLabel = 'Repository';
                } else if (scan.scanType === 'API_SECURITY') {
                  assetTypeLabel = 'API';
                }

                return (
                  <div key={scan.id} className="grid grid-cols-12 gap-4 items-center px-6 py-4 transition-colors group text-xs"
                    style={{ color: 'var(--color-text-primary)', borderColor: 'var(--color-border)' }}
                    onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--color-bg-secondary)')}
                    onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
                  >
                    
                    {/* Target column (col-span-4) */}
                    <div className="col-span-4 flex items-center">
                      <div className="mr-3 text-text-muted flex-shrink-0">
                        {scan.target.type === 'REPOSITORY' ? (
                          <svg className="w-4 h-4 text-text-muted" fill="currentColor" viewBox="0 0 24 24">
                            <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.464-1.11-1.464-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.579.688.481C19.137 20.162 22 16.418 22 12c0-5.523-4.477-10-10-10z" />
                          </svg>
                        ) : scan.scanType === 'API_SECURITY' ? (
                          <svg className="w-4 h-4 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5" />
                          </svg>
                        ) : (
                          <svg className="w-4 h-4 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
                          </svg>
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-text-primary truncate" style={{ fontFamily: 'var(--font-body)' }}>
                          {scan.target.name}
                        </p>
                        <p className="text-body-xs font-medium text-text-muted mt-0.5">
                          {assetTypeLabel}
                        </p>
                      </div>
                    </div>

                    {/* Scan Type column (col-span-2) */}
                    <div className="col-span-2">
                      <p className="font-semibold text-text-primary" style={{ fontFamily: 'var(--font-body)' }}>
                        {scan.scanName
                          ? scan.scanName
                          : scan.scanType === 'QUICK' ? 'Quick Scan'
                          : scan.scanType === 'SSL' ? 'SSL/TLS Analysis'
                          : scan.scanType === 'OWASP' ? 'OWASP Assessment'
                          : scan.scanType === 'DEEP' ? 'Deep Scan'
                          : scan.scanType === 'REPOSITORY' ? 'Repository Scan'
                          : scan.scanType === 'API_SECURITY' ? 'API Security Scan'
                          : scan.scanType === 'STANDARD' ? 'Standard Scan'
                          : scan.scanType === 'ADVANCED' ? 'Advanced Scan'
                          : scan.scanType === 'CUSTOM' ? 'Custom Scan'
                          : scan.scanType
                        }
                      </p>
                      <span className={`inline-block px-1.5 py-0.5 rounded text-body-xs font-bold uppercase border mt-1 select-none ${
                        scan.scanType === 'QUICK'        ? 'bg-success-bg text-text-primary border-border' :
                        scan.scanType === 'SSL'          ? 'bg-info-bg text-text-primary border-border' :
                        scan.scanType === 'OWASP'        ? 'bg-danger-bg text-text-primary border-border' :
                        scan.scanType === 'DEEP'         ? 'bg-info-bg text-text-primary border-border' :
                        scan.scanType === 'REPOSITORY'   ? 'bg-warning-bg text-text-primary border-border' :
                        scan.scanType === 'STANDARD'     ? 'bg-bg-secondary text-text-primary border-border' :
                        scan.scanType === 'ADVANCED'     ? 'bg-bg-secondary text-text-primary border-border' :
                        'bg-bg-secondary text-text-primary border-border'
                      }`}>
                        {scan.scanType === 'REPOSITORY' ? 'Code' : scan.scanType}
                      </span>
                    </div>

                    {/* Status column (col-span-2) */}
                    <div className="col-span-2">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-semibold text-body-sm border select-none ${
                        scan.status === 'COMPLETED' ? 'bg-success-bg text-text-primary border-border' :
                        scan.status === 'RUNNING' ? 'bg-info-bg text-text-primary border-border animate-pulse' :
                        scan.status === 'QUEUED' ? 'bg-warning-bg text-text-primary border-border' :
                        scan.status === 'FAILED' ? 'bg-danger-bg text-text-primary border-border' :
                        'bg-bg-secondary text-text-primary border-border'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          scan.status === 'COMPLETED' ? 'bg-emerald-600' :
                          scan.status === 'RUNNING' ? 'bg-blue-600' :
                          scan.status === 'QUEUED' ? 'bg-warning-bg0' :
                          scan.status === 'FAILED' ? 'bg-red-600' :
                          'bg-bg-muted'
                        }`} />
                        {scan.status.charAt(0) + scan.status.slice(1).toLowerCase()}
                      </span>
                    </div>

                    {/* Started At column (col-span-2) */}
                    <div className="col-span-2 leading-normal">
                      <p className="font-semibold text-text-primary" style={{ fontFamily: 'var(--font-body)' }}>
                        {dateFormatted}
                      </p>
                      <p className="text-body-xs font-medium text-text-muted mt-0.5">
                        {timeFormatted}
                      </p>
                    </div>

                    {/* Duration column (col-span-1) */}
                    <div className="col-span-1 font-mono text-text-secondary">
                      {formatDuration(scan.duration)}
                      {scan.status === 'RUNNING' && (
                        <span className="block text-body-xs font-medium text-text-muted font-normal mt-0.5">Est. 8m left</span>
                      )}
                    </div>

                    {/* Actions column (col-span-1) */}
                    <div className="col-span-1 text-right">
                      <ScanActionMenu
                        scan={scan}
                        onAction={(action) => handleScanAction(scan, action)}
                      />
                    </div>

                  </div>
                );
              })}

              {/* Pagination controls footer nested inside white card */}
              <div className="flex flex-col sm:flex-row justify-between items-center gap-4 p-6 border-t"
                style={{ backgroundColor: 'var(--color-bg-primary)', borderColor: 'var(--color-border)' }}>
                <div className="text-body-sm font-semibold" style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-body)' }}>
                  Showing {((currentPage - 1) * perPage) + 1} to {Math.min(currentPage * perPage, totalScans)} of {totalScans} scans
                </div>
                
                {/* Page count buttons */}
                <div className="flex items-center gap-1">
                  <button
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(currentPage - 1)}
                    className="px-2.5 py-1 rounded text-body-sm disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-all"
                    style={{ border: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-secondary)', color: 'var(--color-text-secondary)' }}
                    onMouseEnter={e => { if (currentPage !== 1) e.currentTarget.style.backgroundColor = 'var(--color-hover)'; }}
                    onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'var(--color-bg-secondary)')}
                  >
                    ◀
                  </button>
                  
                  {[...Array(lastPage)].map((_, i) => {
                    const pageNum = i + 1;
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        className="px-2.5 py-1 rounded text-body-sm font-bold transition-all cursor-pointer"
                        style={currentPage === pageNum
                          ? { backgroundColor: '#C4933F', color: '#FFFFFF', border: '1px solid #C4933F' }
                          : { backgroundColor: 'var(--color-bg-secondary)', color: 'var(--color-text-secondary)', border: '1px solid var(--color-border)' }
                        }
                        onMouseEnter={e => { if (currentPage !== pageNum) e.currentTarget.style.backgroundColor = 'var(--color-hover)'; }}
                        onMouseLeave={e => { if (currentPage !== pageNum) e.currentTarget.style.backgroundColor = 'var(--color-bg-secondary)'; }}
                      >
                        {pageNum}
                      </button>
                    );
                  })}

                  <button
                    disabled={currentPage === lastPage}
                    onClick={() => setCurrentPage(currentPage + 1)}
                    className="px-2.5 py-1 rounded text-body-sm disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-all"
                    style={{ border: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-secondary)', color: 'var(--color-text-secondary)' }}
                    onMouseEnter={e => { if (currentPage !== lastPage) e.currentTarget.style.backgroundColor = 'var(--color-hover)'; }}
                    onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'var(--color-bg-secondary)')}
                  >
                    ▶
                  </button>
                </div>

                {/* Per page count selection */}
                <div className="relative">
                  <select
                    disabled
                    className="pl-3 pr-8 py-1.5 rounded-xl text-body-sm font-bold appearance-none cursor-not-allowed"
                    style={{ backgroundColor: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', color: '#A89880' }}
                  >
                    <option>{perPage} / page</option>
                  </select>
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-body-xs font-bold pointer-events-none" style={{ color: '#A89880' }}>▼</span>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>

      <NewScanModal
        isOpen={isNewScanOpen}
        onClose={() => setIsNewScanOpen(false)}
        onScanCreated={fetchData}
        initialConfig={duplicateConfig}
      />

      {/* Progress Modal */}
      <ProgressModal
        isOpen={activeModal === 'PROGRESS'}
        scanId={selectedScanId}
        onClose={() => setActiveModal(null)}
      />

      {/* Queue Details Modal */}
      <QueueDetailsModal
        isOpen={activeModal === 'QUEUE_DETAILS'}
        scanId={selectedScanId}
        onClose={() => setActiveModal(null)}
      />

      {/* Error Details Modal */}
      <ErrorModal
        isOpen={activeModal === 'ERROR'}
        scanId={selectedScanId}
        onClose={() => setActiveModal(null)}
      />

      {/* Cancel Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={activeModal === 'CANCEL_CONFIRM'}
        title="Cancel Scan?"
        description="Cancelling this scan will stop any remaining modules from executing. Completed data and logs will be preserved."
        confirmLabel="Cancel Scan"
        cancelLabel="Keep Running"
        isDestructive={true}
        onConfirm={handleCancelConfirm}
        onCancel={() => setActiveModal(null)}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={activeModal === 'DELETE_CONFIRM'}
        title="Delete Scan?"
        description="This permanently removes: Scan configuration, Logs, Findings, Results. This action cannot be undone."
        confirmLabel="Delete Scan"
        cancelLabel="Cancel"
        isDestructive={true}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setActiveModal(null)}
      />

      {/* Retry Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={activeModal === 'RETRY_CONFIRM'}
        title="Retry Scan?"
        description="A new scan job will be created using the same configuration. Previous scan history remains unchanged."
        confirmLabel="Retry Scan"
        cancelLabel="Cancel"
        onConfirm={handleRetryConfirm}
        onCancel={() => setActiveModal(null)}
      />
    </DashboardLayout>
  );
}
