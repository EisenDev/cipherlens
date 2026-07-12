import { useState, useEffect, useRef, Fragment } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import DashboardLayout from '../components/DashboardLayout';
import PageHeading from '../components/PageHeading';
import Card from '../components/Card';
import { LoadingScreen } from '../components/LoadingScreen';
import { apiRequest } from '../api/client';
import { 
  ShieldAlert, 
  Shield,
  ShieldCheck,
  AlertTriangle,
  ChevronDown, 
  Share2,
  Zap,
  BarChart2,
  Network,
  Globe,
  Sparkles,
  Star,
  Lock,
  Flame,
  Database,
  Info
} from 'lucide-react';

interface ScanOption {
  id: string;
  scanName?: string;
  createdAt: string;
  status: string;
  score?: number | null;
  duration?: number | null;
  target?: {
    name: string;
    url: string;
    type: string;
  };
}

export default function AIAnalysisPage() {
  const { accessToken: authAccessToken } = useAuthStore();

  // Scans dropdown state
  const [scans, setScans] = useState<ScanOption[]>([]);
  const [selectedAssetUrl, setSelectedAssetUrl] = useState<string>('');
  const [selectedScanId, setSelectedScanId] = useState<string>('');
  const [scanDetails, setScanDetails] = useState<ScanOption | null>(null);

  // Analysis report state
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadingMessage, setLoadingMessage] = useState<string>('Loading latest analysis...');
  const [error, setError] = useState<string | null>(null);

  // Dropdown UI states
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);

  // Dynamically extract top recommendations from scan details
  const getTopRecommendations = (): string[] => {
    const list: string[] = [];
    if (!report) return list;
    
    if (report.remediationRoadmap) {
      const phases = ['phase1', 'phase2', 'phase3', 'phase4'];
      for (const p of phases) {
        const items = report.remediationRoadmap[p];
        if (Array.isArray(items)) {
          for (const item of items) {
            if (typeof item === 'string') {
              list.push(item);
            } else if (item && typeof item === 'object') {
              list.push(item.remediationText || item.title || '');
            }
          }
        }
      }
    }
    
    if (list.length === 0 && Array.isArray(report.prioritizedRisks)) {
      for (const r of report.prioritizedRisks) {
        if (r && typeof r === 'object') {
          list.push(r.remediationText || `Remediate: ${r.title}`);
        }
      }
    }

    const cleanList = list.filter(Boolean).map(s => s.trim()).filter(s => s.length > 0);
    const uniqueList = Array.from(new Set(cleanList)).slice(0, 5);
    
    if (uniqueList.length === 0 && report.severityCounts) {
      const crit = report.severityCounts.critical ?? 0;
      const high = report.severityCounts.high ?? 0;
      if (crit > 0) uniqueList.push("Remediate critical security vulnerability exposures.");
      if (high > 0) uniqueList.push("Enforce strict transport layer security configurations.");
      uniqueList.push("Configure HTTP security headers (CSP, HSTS, X-Frame-Options).");
      uniqueList.push("Enforce secure and HttpOnly session cookies.");
      uniqueList.push("Configure DNS security records (SPF, DKIM, and DMARC alignment).");
    }
    
    return uniqueList.slice(0, 5);
  };



  // Fetch scans list
  const fetchScans = async () => {
    if (!authAccessToken) return;
    try {
      const res = await apiRequest('/api/scans?limit=100', { method: 'GET' });
      const completed = (res.data || []).filter((s: any) => s.status === 'COMPLETED');
      setScans(completed);
      
      if (completed.length > 0) {
        const urls = Array.from(new Set(completed.map((s: any) => s.target?.url).filter(Boolean))) as string[];
        if (urls.length > 0) {
          const defaultUrl = urls[0];
          setSelectedAssetUrl(defaultUrl);
          const defaultScans = completed.filter((s: any) => s.target?.url === defaultUrl);
          if (defaultScans.length > 0) {
            setSelectedScanId(defaultScans[0].id);
          }
        } else {
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
    } catch (err: any) {
      console.error('Failed to fetch scans:', err);
      setLoading(false);
    }
  };

  // Fetch AI report
  const fetchReport = async (scanId: string, force: boolean = false) => {
    if (!authAccessToken || !scanId) return;
    setLoading(true);
    setError(null);

    // Dynamic loading messages to match loading state checklist
    const messages = [
      'Analyzing findings...',
      'Correlating vulnerabilities...',
      'Building remediation plan...',
      'Generating executive summary...',
      'Finalizing report...'
    ];
    let msgIndex = 0;
    setLoadingMessage(messages[0]);
    const timer = setInterval(() => {
      msgIndex = (msgIndex + 1) % messages.length;
      setLoadingMessage(messages[msgIndex]);
    }, 1200);

    try {
      const endpoint = force 
        ? `/api/ai-analysis/${scanId}/generate` 
        : `/api/ai-analysis/${scanId}`;
      const method = force ? 'POST' : 'GET';
      const data = await apiRequest(endpoint, { method });
      setReport(data);

      // Find matching scan info
      const scanInfo = scans.find(s => s.id === scanId);
      if (scanInfo) setScanDetails(scanInfo);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch AI analysis.');
    } finally {
      clearInterval(timer);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchScans();
  }, []);

  useEffect(() => {
    if (selectedAssetUrl) {
      const assetScans = scans.filter(s => s.target?.url === selectedAssetUrl);
      if (assetScans.length > 0) {
        const latestScan = assetScans[0];
        if (selectedScanId !== latestScan.id) {
          setSelectedScanId(latestScan.id);
        }
      }
    }
  }, [selectedAssetUrl, scans]);

  useEffect(() => {
    if (selectedScanId) {
      fetchReport(selectedScanId);
    }
  }, [selectedScanId]);

  // Click outside listener for export menu
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (exportRef.current && !exportRef.current.contains(event.target as Node)) {
        setIsExportOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);



  // Export report handler
  const handleExport = async (format: 'json' | 'markdown' | 'pdf') => {
    if (!selectedScanId) return;
    try {
      const res = await apiRequest(`/api/ai-analysis/${selectedScanId}/export?format=${format}`, {
        method: 'GET'
      });
      if (!res.content) {
        throw new Error('Export content was empty.');
      }
      const binaryString = window.atob(res.content);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const blob = new Blob([bytes], { type: res.mimeType || 'application/octet-stream' });
      const link = document.createElement('a');
      link.href = window.URL.createObjectURL(blob);
      link.download = res.filename || `AI_Analysis_Report.${format === 'markdown' ? 'md' : format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setIsExportOpen(false);
    } catch (err: any) {
      alert('Export failed: ' + (err.message || 'Unknown error'));
    }
  };



  const activeScan = scanDetails || scans.find(s => s.id === selectedScanId);
  const uniqueAssetUrls = Array.from(new Set(scans.map(s => s.target?.url).filter(Boolean))) as string[];


  return (
    <DashboardLayout activePage="ai analysis">
      <div className="py-8 px-10 space-y-7 w-full text-left min-h-screen">
        
        {/* Premium Header Bar */}
        <PageHeading
          title="AI Security Analysis"
          description="AI-powered interpretation of your latest completed scan."
          actions={
            <>
              <button
                onClick={() => fetchReport(selectedScanId, true)}
                className="px-4 py-2 border border-border bg-bg-primary hover:bg-bg-secondary text-text-primary rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm text-xs"
              >
                <Zap className="w-3.5 h-3.5 text-accent" /> Regenerate Analysis
              </button>
              
              <div className="relative" ref={exportRef}>
                <button 
                  onClick={() => setIsExportOpen(!isExportOpen)}
                  className="px-4 py-2 border border-border bg-bg-primary hover:bg-bg-secondary text-text-primary rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm text-xs"
                >
                  Export <ChevronDown className="w-3.5 h-3.5" />
                </button>
                {isExportOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-bg-primary border border-border rounded-2xl shadow-lg py-1.5 z-50 text-left flex flex-col font-semibold text-xs text-text-primary">
                    <button onClick={() => handleExport('pdf')} className="px-4 py-2 hover:bg-bg-secondary text-left w-full">Export HTML/PDF</button>
                    <button onClick={() => handleExport('markdown')} className="px-4 py-2 hover:bg-bg-secondary text-left w-full">Export Markdown</button>
                    <button onClick={() => handleExport('json')} className="px-4 py-2 hover:bg-bg-secondary text-left w-full">Export Raw JSON</button>
                  </div>
                )}
              </div>

              <button 
                onClick={() => setIsShareModalOpen(true)}
                className="px-4 py-2 border border-border bg-bg-primary hover:bg-bg-secondary text-text-primary rounded-xl flex items-center gap-2 transition-colors cursor-pointer shadow-sm text-xs relative overflow-hidden"
              >
                Share <Share2 className="w-3.5 h-3.5 text-text-muted" />
                <span className="px-1.5 py-0.5 bg-accent text-[8px] font-extrabold text-[var(--color-bg-primary)] rounded uppercase tracking-wider ml-1 leading-none shadow-sm">Soon</span>
              </button>
            </>
          }
        />

        {/* Target Asset Dropdown Selector */}
        {uniqueAssetUrls.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-4 bg-bg-primary border border-border rounded-3xl p-4 shadow-sm w-full">
            <div className="flex items-center gap-3 text-sm font-bold text-text-primary">
              <span className="text-text-muted flex items-center gap-1">
                <Database className="w-3.5 h-3.5 text-text-muted" /> Target
              </span>
              <select
                value={selectedAssetUrl}
                onChange={(e) => setSelectedAssetUrl(e.target.value)}
                className="bg-bg-secondary border border-border rounded-xl px-3 py-1.5 text-xs font-bold text-text-primary cursor-pointer outline-none max-w-[280px] truncate"
              >
                {uniqueAssetUrls.map(url => (
                  <option key={url} value={url}>{url}</option>
                ))}
              </select>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-bg-secondary border border-border text-text-primary uppercase">
                COMPLETED
              </span>
              {activeScan && (
                <span className="text-text-muted text-xs font-semibold font-mono">
                  {new Date(activeScan.createdAt).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Scan Journey Timeline */}
        {selectedAssetUrl && scans.filter(s => s.target?.url === selectedAssetUrl).length > 0 && (
          <div className="bg-bg-primary border border-border rounded-3xl p-5 shadow-sm space-y-3.5 w-full">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-text-muted">Scan Journey Timeline</h3>
                <p className="text-xs text-text-muted mt-0.5 font-semibold">Chronological path of all scans executed on {selectedAssetUrl}</p>
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-bg-secondary text-text-muted border border-border font-mono">
                {scans.filter(s => s.target?.url === selectedAssetUrl).length} Scans
              </span>
            </div>
            
            <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-none">
              {scans
                .filter(s => s.target?.url === selectedAssetUrl)
                .slice()
                .reverse()
                .map((s, idx, arr) => {
                  const isActive = s.id === selectedScanId;
                  const dateStr = new Date(s.createdAt).toLocaleDateString('en-US', { 
                    month: 'short', 
                    day: 'numeric', 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  });
                  return (
                    <Fragment key={s.id}>
                      <button
                        onClick={() => setSelectedScanId(s.id)}
                        className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl border text-xs font-bold flex-shrink-0 transition-all cursor-pointer ${
                          isActive 
                            ? 'bg-bg-secondary text-text-primary border-border shadow-md scale-102 font-extrabold'
                            : 'bg-bg-primary text-text-primary border-border hover:border-border-strong shadow-sm'
                        }`}
                      >
                        <span className={`w-2 h-2 rounded-full ${isActive ? 'bg-bg-primary animate-pulse' : 'bg-slate-300'}`} />
                        <div className="text-left">
                          <span className="block text-[10px] uppercase tracking-wider opacity-85 leading-none">Scan {idx + 1}</span>
                          <span className="block mt-1 leading-tight">{dateStr}</span>
                          {s.score !== null && (
                            <span className={`inline-block text-[10px] rounded px-1.5 py-0.5 mt-1 font-mono ${
                              isActive ? 'bg-bg-primary text-text-primary border border-border' : 'bg-bg-secondary text-text-muted border border-border'
                            }`}>
                              Scan #{idx + 1}
                            </span>
                          )}
                        </div>
                      </button>
                      {idx < arr.length - 1 && (
                        <div className="w-5 h-0.5 bg-border flex-shrink-0" />
                      )}
                    </Fragment>
                  );
                })}
            </div>
          </div>
        )}

        {/* Loading Wizard */}
        {loading ? (
          <LoadingScreen 
            fullPage={false} 
            title={loadingMessage} 
            subtitle="CipherLens AI is structuring security intelligence..." 
          />
        ) : error || !report || !selectedScanId ? (
          <div className="py-20 bg-bg-primary border border-border rounded-3xl shadow-sm flex flex-col items-center justify-center text-center p-6 space-y-4 w-full">
            <div className="w-12 h-12 bg-bg-secondary border border-border rounded-full flex items-center justify-center text-text-muted">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div className="space-y-1 max-w-sm">
              <p className="text-sm font-bold text-text-primary">No Analysis Available</p>
              <p className="text-xs text-text-muted">
                {error || 'No completed scan findings exist to generate an AI Security Analysis report.'}
              </p>
            </div>
            {scans.length > 0 && (
              <button 
                onClick={() => fetchReport(selectedScanId, true)}
                className="px-4 py-2 bg-accent hover:bg-accent-dark text-xs font-bold text-white rounded-xl transition-colors cursor-pointer animate-fade-in"
              >
                Generate Analysis
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-7 w-full">
            
            {/* 6 KPI Cards Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 w-full">
              
              {/* 1. Security Posture */}
              {(() => {
                const p = report.posture || 'Unknown';
                const cfg: Record<string, { bg: string; border: string; text: string; dot: string; iconBg: string }> = {
                  Excellent: { bg: 'bg-success-bg', border: 'border-border', text: 'text-text-primary', dot: 'bg-success', iconBg: 'bg-success-bg text-text-primary border-border' },
                  Good:      { bg: 'bg-success-bg', border: 'border-border', text: 'text-text-primary', dot: 'bg-success', iconBg: 'bg-success-bg text-text-primary border-border' },
                  Fair:      { bg: 'bg-warning-bg', border: 'border-border', text: 'text-text-primary', dot: 'bg-warning', iconBg: 'bg-warning-bg text-text-primary border-border' },
                  Poor:      { bg: 'bg-warning-bg', border: 'border-border', text: 'text-text-primary', dot: 'bg-warning', iconBg: 'bg-warning-bg text-text-primary border-border' },
                  Critical:  { bg: 'bg-danger-bg',  border: 'border-border', text: 'text-text-primary', dot: 'bg-danger', iconBg: 'bg-danger-bg text-text-primary border-border' },
                };
                const c = cfg[p] || cfg.Fair;
                return (
                  <Card className="flex flex-col justify-between text-left">
                    <div className="flex items-center gap-1.5">
                      <Shield className="w-3.5 h-3.5 text-text-muted" />
                      <span className="text-xs font-bold text-text-muted uppercase tracking-wider">Security Posture</span>
                    </div>
                    <div className="my-3 flex items-center gap-2.5">
                      <div className={`w-8 h-8 rounded-lg border ${c.iconBg} flex items-center justify-center flex-shrink-0 shadow-sm`}>
                        <ShieldCheck className="w-4 h-4" />
                      </div>
                      <span className={`text-xl font-bold tracking-tight ${c.text}`}>{p}</span>
                    </div>
                     <p className="text-xs text-text-muted leading-relaxed">{report.riskDescription}</p>
                  </Card>
                );
              })()}

              {/* 2. Confidence */}
              {(() => {
                const pct  = report.confidence ?? 0;
                const rate = report.confidenceRating || 'Medium';
                const rateColor = rate === 'High' ? 'text-success' : rate === 'Medium' ? 'text-warning' : 'text-danger';
                const barColor  = rate === 'High' ? 'bg-success' : rate === 'Medium' ? 'bg-warning' : 'bg-danger';
                return (
                  <Card className="flex flex-col justify-between text-left">
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center gap-1.5">
                        <Zap className="w-3.5 h-3.5 text-text-muted" />
                        <span className="text-xs font-bold text-text-muted uppercase tracking-wider">Confidence</span>
                      </div>
                      <span title="Assessment confidence level based on scan verification">
                        <Info className="w-3.5 h-3.5 text-text-muted cursor-help" />
                      </span>
                    </div>
                    <div className="my-3">
                      <div className="flex items-end gap-1.5">
                        <span className="text-2xl font-bold font-mono text-text-primary">{pct}%</span>
                        <span className={`text-xs font-extrabold mb-0.5 uppercase tracking-wider ${rateColor}`}>{rate}</span>
                      </div>
                      <div className="mt-2.5 h-1.5 w-full bg-bg-muted rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${barColor} transition-all`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                    <p className="text-xs text-text-muted leading-relaxed">{report.confidenceReason}</p>
                  </Card>
                );
              })()}

              {/* 3. Coverage */}
              {(() => {
                const pct      = report.coverage ?? 0;
                const executed = report.executedScannersCount ?? 0;
                const total    = report.totalScannersCount ?? 0;
                const skipped  = report.skippedScannersCount ?? 0;
                return (
                  <Card className="flex flex-col justify-between text-left">
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center gap-1.5">
                        <Network className="w-3.5 h-3.5 text-text-muted" />
                        <span className="text-xs font-bold text-text-muted uppercase tracking-wider">Coverage</span>
                      </div>
                      <span title="Coverage represents executed vs planned modules">
                        <Info className="w-3.5 h-3.5 text-text-muted cursor-help" />
                      </span>
                    </div>
                    <div className="my-3">
                      <span className="text-2xl font-bold font-mono text-text-primary">{pct}%</span>
                      <div className="mt-2.5 h-1.5 w-full bg-bg-muted rounded-full overflow-hidden">
                        <div className="h-full rounded-full bg-info transition-all" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                    <p className="text-xs text-text-muted leading-relaxed">
                      {executed} of {total} scanners executed / {skipped} scanners were skipped
                    </p>
                  </Card>
                );
              })()}

              {/* 4. Critical Issues */}
              <Card className="flex flex-col justify-between text-left">
                <div className="flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-danger" />
                  <span className="text-xs font-bold text-text-muted uppercase tracking-wider">Critical Issues</span>
                </div>
                <div className="my-3 flex items-center gap-2">
                  <span className="text-2xl font-bold font-mono text-danger">{report.severityCounts.critical}</span>
                </div>
                <p className="text-xs text-text-muted leading-relaxed">Critical findings that require immediate action.</p>
              </Card>

              {/* 5. Total Findings */}
              <Card className="flex flex-col justify-between text-left">
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-1.5">
                    <BarChart2 className="w-3.5 h-3.5 text-text-muted" />
                    <span className="text-xs font-bold text-text-muted uppercase tracking-wider">Total Findings</span>
                  </div>
                  <span title="Consolidated findings count">
                    <Info className="w-3.5 h-3.5 text-text-muted cursor-help" />
                  </span>
                </div>
                <div className="my-3">
                  <span className="text-2xl font-bold font-mono text-text-primary">
                    {report.severityCounts.critical + report.severityCounts.high + report.severityCounts.medium + report.severityCounts.low + report.severityCounts.info}
                  </span>
                  <div className="flex flex-wrap gap-2 mt-4 font-extrabold text-xs">
                    <span className="px-1.5 py-0.5 rounded bg-danger-bg text-text-primary border border-border">{report.severityCounts.critical}C</span>
                    <span className="px-1.5 py-0.5 rounded bg-warning-bg text-text-primary border border-border">{report.severityCounts.high}H</span>
                    <span className="px-1.5 py-0.5 rounded bg-warning-bg text-text-primary border border-border">{report.severityCounts.medium}M</span>
                    <span className="px-1.5 py-0.5 rounded bg-info-bg text-text-primary border border-border">{report.severityCounts.low}L</span>
                    <span className="px-1.5 py-0.5 rounded bg-bg-secondary text-text-primary border border-border">{report.severityCounts.info}I</span>
                  </div>
                </div>
              </Card>

              {/* 6. Most Exposed Area */}
              <Card className="flex flex-col justify-between text-left">
                <div className="flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 text-text-muted" />
                  <span className="text-xs font-bold text-text-muted uppercase tracking-wider">Most Exposed Area</span>
                </div>
                <div className="my-3 flex items-center gap-2">
                  <span className="text-sm font-bold text-text-primary leading-tight truncate">{report.mostExposedArea || 'Web Application'}</span>
                </div>
                <p className="text-xs text-text-muted leading-relaxed">
                  {report.mostExposedAreaCount || 0} findings concentrated in this area.
                </p>
              </Card>

            </div>

            {/* Main grid layout: 2 Columns (Content) / 1 Column (Priorities/Compliance) */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-7 w-full text-left items-start">
              
              {/* Column 1 & 2: Briefing Details */}
              <div className="lg:col-span-2 space-y-7">
                
                {/* 1. Executive Summary */}
                <Card className="p-6">
                  <div className="space-y-4">
                    <h3 className="text-sm font-bold text-text-primary flex items-center gap-1.5 uppercase tracking-wider text-text-muted">
                      <Sparkles className="w-4 h-4 text-purple-600" /> Executive Summary
                    </h3>
                    <p className="text-sm text-text-primary leading-relaxed">
                      {report.executiveSummary}
                    </p>
                    
                    <div className="border-t border-border pt-4 space-y-3.5 text-xs font-bold">
                      <div className="flex items-start gap-2.5">
                        <ShieldAlert className="w-4 h-4 text-success mt-0.5 flex-shrink-0" />
                        <div>
                          <span className="text-xs text-text-muted uppercase tracking-wider block">Primary Risk</span>
                          <span className="text-text-primary block mt-0.5 leading-tight">{report.primaryRisk}</span>
                        </div>
                      </div>
                      <div className="flex items-start gap-2.5">
                        <AlertTriangle className="w-4 h-4 text-text-muted mt-0.5 flex-shrink-0" />
                        <div>
                          <span className="text-xs text-text-muted uppercase tracking-wider block">Most Critical Issue</span>
                          <span className="text-text-primary block mt-0.5 leading-tight">{report.criticalObservations.mostImportantFinding}</span>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4 pt-2 border-t border-border-warm">
                        <div>
                          <span className="text-xs text-text-muted uppercase block tracking-wider flex items-center gap-1">
                            <Lock className="w-3.5 h-3.5 text-text-muted" /> Attack Complexity
                          </span>
                          <span className="text-text-primary block mt-0.5 capitalize">{report.attackComplexity}</span>
                        </div>
                        <div>
                          <span className="text-xs text-text-muted uppercase block tracking-wider flex items-center gap-1">
                            <Flame className="w-3.5 h-3.5 text-orange-500" /> Remediation Time
                          </span>
                          <span className="text-text-primary block mt-0.5">{report.remediationTime}</span>
                        </div>
                      </div>
                    </div>

                    {/* Dynamic Trend Summary block */}
                    {(() => {
                      const newCount = report.newFindingsCount || 0;
                      const resCount = report.resolvedFindingsCount || 0;
                      const netChange = newCount - resCount;
                      const trendDesc = netChange > 0 
                        ? `resulting in a net increase of ${netChange} findings and a slightly increased attack surface vulnerability.`
                        : netChange < 0
                        ? `resulting in a net decrease of ${Math.abs(netChange)} findings and a strengthened security posture.`
                        : `resulting in no net change to the total findings count.`;

                      return (
                        <div className="bg-bg-secondary/50 border border-border rounded-2xl p-4 text-xs font-semibold text-text-secondary leading-relaxed mt-4">
                          <span className="font-bold text-text-primary block mb-1">Scan Comparison & Trend Summary</span>
                          Compared to the previous scan, <span className="text-success font-bold">{resCount} findings were resolved</span> while <span className="text-danger font-bold">{newCount} new findings were introduced</span>, {trendDesc}
                        </div>
                      );
                    })()}

                  </div>
                </Card>

                {/* 2. Risk Narrative */}
                <Card className="p-6">
                  <div className="space-y-4">
                    <h3 className="text-sm font-bold text-text-primary flex items-center gap-1.5 uppercase tracking-wider text-text-muted">
                      <Shield className="w-4 h-4 text-text-secondary" /> Risk Narrative
                    </h3>
                    <p className="text-sm text-text-primary leading-relaxed whitespace-pre-line">
                      {report.riskNarrative}
                    </p>
                  </div>
                </Card>

                {/* 3. Recommended Remediation */}
                <Card className="p-6">
                  <div className="space-y-4">
                    <h3 className="text-sm font-bold text-text-primary flex items-center gap-1.5 uppercase tracking-wider text-text-muted">
                      <ShieldCheck className="w-4 h-4 text-success" /> Recommended Remediation
                    </h3>
                    <p className="text-xs text-text-muted leading-relaxed">
                      Based on the assessment findings, the security team recommends prioritizing the following highest-impact actions first to mitigate the largest portion of your overall exposure:
                    </p>
                    <div className="space-y-3 pt-2">
                      {getTopRecommendations().map((rec, idx) => (
                        <div key={idx} className="flex gap-3 items-start bg-bg-secondary border border-border rounded-xl p-3 text-xs text-text-primary font-semibold">
                          <span className="w-5 h-5 rounded-full bg-bg-primary border border-border text-text-primary font-bold flex items-center justify-center flex-shrink-0 font-mono text-[10px]">
                            {idx + 1}
                          </span>
                          <span className="leading-relaxed mt-0.5">{rec}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </Card>

              </div>

              {/* Column 3: Checklists, Priorities, and Standards */}
              <div className="space-y-7">
                
                {/* 1. Top Priorities */}
                <Card className="p-6">
                  <div className="space-y-4">
                    <h3 className="text-sm font-bold text-text-primary flex items-center gap-1.5 uppercase tracking-wider text-text-muted">
                      <Star className="w-4 h-4 text-warning" /> Top Priorities
                    </h3>
                    <div className="space-y-3">
                      {report.prioritizedRisks.slice(0, 5).map((risk: any, i: number) => {
                        const sev = (risk.severity || '').toLowerCase();
                        const sevBadgeColor = sev === 'critical' ? 'bg-danger-bg text-text-primary border-border' : sev === 'high' ? 'bg-warning-bg text-text-primary border-border' : 'bg-warning-bg text-text-primary border-border';
                        return (
                          <div key={i} className="flex justify-between items-center bg-bg-secondary/50 border border-border rounded-xl p-2.5 hover:border-border-strong transition-all gap-2 text-xs">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <span className="w-5 h-5 rounded-full bg-bg-primary border border-border text-xs font-bold flex items-center justify-center text-text-muted font-mono flex-shrink-0">
                                {i + 1}
                              </span>
                              <div className="min-w-0">
                                <span className="font-bold text-text-primary block truncate leading-tight">
                                  {risk.title}
                                </span>
                                <span className="text-[10px] text-text-muted uppercase tracking-wider block mt-0.5 font-mono">
                                  {risk.findingCode}
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center gap-1.5 flex-shrink-0">
                              <span className={`px-1.5 py-0.5 rounded text-[10px] font-extrabold tracking-wide uppercase border ${sevBadgeColor}`}>
                                {sev}
                              </span>
                              <span className="font-mono text-text-muted whitespace-nowrap">{risk.cvss} cvss</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </Card>

                {/* 2. Compliance Impact */}
                <Card className="p-6">
                  <div className="space-y-4">
                    <h3 className="text-sm font-bold text-text-primary flex items-center gap-1.5 uppercase tracking-wider text-text-muted">
                      <Network className="w-4 h-4 text-info" /> Compliance Impact
                    </h3>
                    <p className="text-xs text-text-muted leading-relaxed">
                      Dynamic compliance alignment based on the active scan vulnerability weights and configuration issues:
                    </p>
                    
                    {(() => {
                      const crit = report.severityCounts.critical ?? 0;
                      const high = report.severityCounts.high ?? 0;
                      const med = report.severityCounts.medium ?? 0;
                      const low = report.severityCounts.low ?? 0;
                      
                      const owaspScore = Math.max(10, Math.min(100, 100 - (crit * 15 + high * 8 + med * 4 + low * 1)));
                      const nistScore = Math.max(10, Math.min(100, 100 - (crit * 12 + high * 6 + med * 3 + low * 1)));
                      const cisScore = Math.max(10, Math.min(100, 100 - (crit * 10 + high * 5 + med * 2 + low * 1)));
                      const isoScore = Math.max(10, Math.min(100, 100 - (crit * 14 + high * 7 + med * 4 + low * 1)));

                      const standards = [
                        { name: 'OWASP Top 10', score: owaspScore, color: 'bg-danger' },
                        { name: 'PCI DSS 4.0', score: Math.max(10, Math.min(100, 100 - (crit * 20 + high * 10 + med * 5 + low * 1))), color: 'bg-warning' },
                        { name: 'NIST CSF', score: nistScore, color: 'bg-warning' },
                        { name: 'CIS Controls', score: cisScore, color: 'bg-info' },
                        { name: 'ISO 27001', score: isoScore, color: 'bg-success' }
                      ];

                      return (
                        <div className="space-y-4 pt-2">
                          {standards.map((std, idx) => (
                            <div key={idx} className="space-y-1.5 text-xs font-bold text-text-primary">
                              <div className="flex justify-between items-center">
                                <span>{std.name}</span>
                                <span className="font-mono">{std.score}%</span>
                              </div>
                              <div className="w-full h-1.5 bg-bg-muted rounded-full overflow-hidden">
                                <div className={`h-full ${std.color} transition-all`} style={{ width: `${std.score}%` }} />
                              </div>
                            </div>
                          ))}
                        </div>
                      );
                    })()}
                  </div>
                </Card>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Coming Soon Share Modal */}
      {isShareModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-bg-primary border border-border rounded-2xl w-full max-w-md shadow-xl overflow-hidden relative">
            <div className="p-6 text-center">
              <div className="w-16 h-16 mx-auto bg-bg-secondary border border-border rounded-full flex items-center justify-center mb-4">
                <Share2 className="w-8 h-8 text-accent" />
              </div>
              <h2 className="text-xl font-bold text-text-primary mb-2 font-mono">Sharing is Almost Here!</h2>
              <p className="text-sm text-text-muted leading-relaxed mb-6">
                We're building a seamless way for you to securely share security analysis reports and remediation plans with your entire team. Stay tuned!
              </p>
              <button 
                onClick={() => setIsShareModalOpen(false)}
                className="w-full py-2.5 bg-bg-secondary hover:bg-border border border-border rounded-xl text-sm font-bold transition-colors"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
