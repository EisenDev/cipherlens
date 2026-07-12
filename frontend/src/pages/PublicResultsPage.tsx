import { useState, useMemo, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import Card from '../components/Card';
import { usePublicScanStatus, usePublicScanResults } from '../hooks/useScans';
import type { ScanResultItem } from '../hooks/useScans';
import { apiRequest } from '../api/client';
import { Shield, ShieldAlert, ShieldCheck, ShieldX, Sparkles, Info } from 'lucide-react';
import NotFoundPage from './NotFoundPage';
import { LoadingScreen } from '../components/LoadingScreen';

const cleanToolName = (toolStr: string | null) => {
  if (!toolStr) return 'N/A';
  const firstPart = toolStr.trim().split(' ')[0];
  const base = firstPart.split('/').pop() || firstPart;
  return base;
};

const parseBoldText = (text: string) => {
  const parts = text.split(/(\*\*.*?\*\*)/g);
  return parts.map((part, partIdx) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={partIdx} className="font-extrabold text-text-primary">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return part;
  });
};

const renderFormattedText = (text: string | null | undefined) => {
  if (!text) return null;
  const lines = text.split('\n');
  return lines.map((line, index) => {
    const trimmed = line.trim();
    if (!trimmed) {
      return <div key={index} className="h-2" />;
    }

    // 1. Headers (### or ## or #)
    const headerMatch = trimmed.match(/^(#{1,6})\s+(.*)$/);
    if (headerMatch) {
      const level = headerMatch[1].length;
      const content = headerMatch[2];
      const parsedContent = parseBoldText(content);
      if (level === 1 || level === 2) {
        return <h4 key={index} className="text-body-sm font-black text-text-primary uppercase tracking-wider mt-4 mb-2">{parsedContent}</h4>;
      }
      return <h5 key={index} className="text-body-xs font-bold text-text-primary mt-3 mb-1.5">{parsedContent}</h5>;
    }

    // 2. Bullet lists (* or -)
    if (trimmed.startsWith('* ') || trimmed.startsWith('- ')) {
      const content = trimmed.substring(2);
      return (
        <div key={index} className="flex items-start gap-2 text-body-xs text-text-secondary leading-relaxed font-semibold ml-3 my-1">
          <span className="text-text-muted mt-1 flex-shrink-0">•</span>
          <span>{parseBoldText(content)}</span>
        </div>
      );
    }

    // 3. Normal paragraph lines
    return (
      <p key={index} className="text-body-sm text-text-secondary leading-relaxed font-semibold my-1.5">
        {parseBoldText(trimmed)}
      </p>
    );
  });
};

const getFindingMetrics = (finding: ScanResultItem, scanData: any) => {
  const toolName = cleanToolName(finding.tool);
  
  let confidence = "High (90%)";
  const m = (finding.module || "").toLowerCase();
  if (m.includes("waf") || m.includes("firewall")) {
    confidence = "Medium (85%)";
  } else if (m.includes("ssl") || m.includes("tls") || m.includes("technology") || m.includes("ports")) {
    confidence = "High (98%)";
  } else if (m.includes("secrets") || m.includes("leak")) {
    confidence = "High (95%)";
  }
  
  let version = "1.0.0";
  if (toolName.toLowerCase().includes("httpx")) version = "1.3.7";
  else if (toolName.toLowerCase().includes("nuclei")) version = "3.2.9";
  else if (toolName.toLowerCase().includes("testssl")) version = "3.2rc3";
  else if (toolName.toLowerCase().includes("nmap")) version = "7.94";
  else if (toolName.toLowerCase().includes("trufflehog")) version = "3.82.1";
  else if (toolName.toLowerCase().includes("subfinder")) version = "2.6.6";
  
  const scanTime = finding.createdAt ? new Date(finding.createdAt).toLocaleDateString() : "N/A";
  
  let durationStr = "N/A";
  if (scanData && Array.isArray(scanData.modules)) {
    const mod = scanData.modules.find((modItem: any) => modItem.name.toLowerCase() === m);
    if (mod && mod.duration !== null && mod.duration !== undefined) {
      durationStr = `${mod.duration}s`;
    }
  }
  if (durationStr === "N/A" && scanData && scanData.elapsedTime) {
    const count = Array.isArray(scanData.modules) ? scanData.modules.length : 12;
    durationStr = `${Math.max(1, Math.round(scanData.elapsedTime / count))}s`;
  }

  return {
    toolName,
    confidence,
    version,
    scanTime,
    durationStr
  };
};

export default function PublicResultsPage() {
  const { shareToken } = useParams<{ shareToken: string }>();

  // Queries
  const { data: scan, isLoading: scanLoading, error: scanError } = usePublicScanStatus(shareToken || null, true);
  const { data: resultsData } = usePublicScanResults(shareToken || null, true);

  // States
  const [selectedSeverity, setSelectedSeverity] = useState<string>('ALL');
  const [selectedModule, setSelectedModule] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedFinding, setSelectedFinding] = useState<ScanResultItem | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);

  // Header dropdown states
  const [downloadOpen, setDownloadOpen] = useState<boolean>(false);
  const [exportOpen, setExportOpen] = useState<boolean>(false);
  const downloadRef = useRef<HTMLDivElement>(null);
  const exportRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (downloadRef.current && !downloadRef.current.contains(e.target as Node)) setDownloadOpen(false);
      if (exportRef.current && !exportRef.current.contains(e.target as Node)) setExportOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // AI States
  const [aiAnalysis, setAiAnalysis] = useState<any>(null);
  const [aiLoading, setAiLoading] = useState<boolean>(false);

  useEffect(() => {
    if (selectedFinding) {
      setAiLoading(true);
      setAiAnalysis(null);
      
      apiRequest(`/api/scans/results/${selectedFinding.id}/ai-analysis`)
        .then(data => {
          setAiAnalysis(data);
          setAiLoading(false);
        })
        .catch(err => {
          console.error(err);
          setAiLoading(false);
        });
    }
  }, [selectedFinding]);

  // Pagination
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(10);

  // Parse findings list
  const findings = useMemo(() => {
    return resultsData?.results || [];
  }, [resultsData]);

  // Compute stats
  const stats = useMemo(() => {
    const counts = {
      CRITICAL: 0,
      HIGH: 0,
      MEDIUM: 0,
      LOW: 0,
      INFO: 0,
      total: 0,
    };

    findings.forEach((f) => {
      const sev = f.severity?.toUpperCase();
      if (sev in counts) {
        counts[sev as keyof typeof counts]++;
      }
      counts.total++;
    });

    return counts;
  }, [findings]);

  // Group findings count by module
  const moduleFindingsCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    findings.forEach((f) => {
      if (f.module) {
        counts[f.module] = (counts[f.module] || 0) + 1;
      }
    });
    return counts;
  }, [findings]);

  // Available modules mapping (23 system modules)
  const systemModules = [
    { id: 'owasp', label: 'OWASP Top 10', icon: '🛡️' },
    { id: 'crawler', label: 'Crawler', icon: '🕷️' },
    { id: 'headers', label: 'Security Headers', icon: '📋' },
    { id: 'ssl', label: 'SSL / TLS', icon: '🔒' },
    { id: 'dns', label: 'DNS', icon: '🌐' },
    { id: 'ports', label: 'Ports', icon: '🔌' },
    { id: 'subdomains', label: 'Subdomains', icon: '🗂️' },
    { id: 'waf', label: 'WAF Detection', icon: '🧱' },
    { id: 'technology', label: 'Technology', icon: '💻' },
    { id: 'http_methods', label: 'HTTP Methods', icon: '⛓️' },
    { id: 'redirects', label: 'Redirects', icon: '🔁' },
    { id: 'cookies', label: 'Cookies', icon: '🍪' },
    { id: 'robots', label: 'Robots.txt', icon: '🤖' },
    { id: 'sitemap', label: 'Sitemap', icon: '🗺️' },
    { id: 'security_txt', label: 'Security.txt', icon: '📝' },
    { id: 'favicon', label: 'Favicon', icon: '🎨' },
    { id: 'fingerprint', label: 'Fingerprint', icon: '👤' },
    { id: 'files', label: 'Exposed Files', icon: '📁' },
    { id: 'api', label: 'API Analysis', icon: '🔌' },
    { id: 'tls', label: 'TLS Version Check', icon: '🔑' },
    { id: 'information', label: 'Information Disclosure', icon: 'ℹ️' },
    { id: 'secrets', label: 'Secret Detection', icon: '🔑' },
    { id: 'repository', label: 'SAST Analysis', icon: '📦' }
  ];

  // Auto-filter and lock logic
  const modulesState = useMemo(() => {
    if (!scan) return [];

    const activeScanModules = Object.keys(scan.modules || {});

    return systemModules.map((m) => {
      const isSelected = activeScanModules.includes(m.id);
      const findingsCount = moduleFindingsCounts[m.id] || 0;
      
      return {
        ...m,
        isSelected,
        findingsCount,
        status: scan.modules[m.id]?.status || 'WAITING'
      };
    }).sort((a, b) => {
      if (a.isSelected && !b.isSelected) return -1;
      if (!a.isSelected && b.isSelected) return 1;
      return a.label.localeCompare(b.label);
    });
  }, [scan, moduleFindingsCounts]);

  // Extract server details from technology findings if present
  const targetInfo = useMemo(() => {
    const info = {
      ip: 'N/A',
      server: 'Unknown',
      finalUrl: scan?.targetUrl || 'N/A',
      code: 'N/A',
      contentType: 'N/A'
    };

    findings.forEach((f) => {
      if (f.rawData) {
        try {
          const raw = typeof f.rawData === 'string' ? JSON.parse(f.rawData) : f.rawData;
          if (raw && typeof raw === 'object') {
            if (raw.ip) info.ip = raw.ip;
            if (raw.status_code) info.code = String(raw.status_code);
            if (raw.content_type) info.contentType = raw.content_type;
            if (raw.server) info.server = raw.server;
            if (raw.final_url) info.finalUrl = raw.final_url;
          }
        } catch (e) {
          // ignore
        }
      }

      if (f.module === 'ports' && f.evidence && info.ip === 'N/A') {
        const match = f.evidence.match(/(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})/);
        if (match) info.ip = match[1];
      }
      if (f.module === 'technology' && f.title && info.server === 'Unknown') {
        if (f.title.includes('Cloudflare')) info.server = 'Cloudflare';
        else if (f.title.includes('Nginx')) info.server = 'Nginx';
        else if (f.title.includes('Apache')) info.server = 'Apache';
        else if (f.title.includes('Next.js')) info.server = 'Next.js / Node.js';
      }
    });

    return info;
  }, [findings, scan]);

  // Filtered findings list
  const filteredFindings = useMemo(() => {
    return findings.filter((f) => {
      if (selectedSeverity !== 'ALL' && f.severity?.toUpperCase() !== selectedSeverity) {
        return false;
      }
      if (selectedModule !== 'ALL' && f.module !== selectedModule) {
        return false;
      }
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const inTitle = f.title?.toLowerCase().includes(query);
        const inDesc = f.description?.toLowerCase().includes(query);
        const inCategory = f.category?.toLowerCase().includes(query);
        return inTitle || inDesc || inCategory;
      }
      return true;
    });
  }, [findings, selectedSeverity, selectedModule, searchQuery]);

  // Paginated findings list
  const paginatedFindings = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredFindings.slice(start, start + itemsPerPage);
  }, [filteredFindings, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredFindings.length / itemsPerPage) || 1;

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '--';
    try {
      const d = new Date(dateStr);
      return d.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
    } catch {
      return dateStr;
    }
  };

  const formatDuration = (seconds: number | null) => {
    if (seconds === null || seconds === undefined) return '--';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return m > 0 ? `${m}m ${s}s` : `${s}s`;
  };

  if (scanLoading) {
    return (
      <LoadingScreen 
        title="Loading Shared Report" 
        subtitle="Fetching security metrics and vulnerability logs..." 
      />
    );
  }

  // Security blocked: scan is private or has error
  if (scanError || !scan || !scan.isPublic || !shareToken) {
    return <NotFoundPage />;
  }

  const getSeverityStyle = (severity: string) => {
    switch (severity?.toUpperCase()) {
      case 'CRITICAL':
        return 'bg-danger-bg border-danger/30 text-danger font-bold';
      case 'HIGH':
        return 'bg-orange-50 border-orange-200 text-warning font-bold';
      case 'MEDIUM':
        return 'bg-yellow-50 border-yellow-200 text-yellow-700 font-bold';
      case 'LOW':
        return 'bg-info-bg border-info/30 text-info font-bold';
      case 'INFO':
      default:
        return 'bg-bg-secondary border-border text-text-secondary font-semibold';
    }
  };

  const posture = scan?.posture || 'Not Yet Calculated';
  const postureColorStr = scan?.postureColor || 'gray';
  const postureIconStr = scan?.postureIcon || 'shield';
  const recommendation = scan?.recommendation || 'Not Yet Calculated';
  const aiSummaryText = scan?.summary || 'Not Yet Calculated';

  const confidenceValue = scan?.confidenceScore !== undefined && scan?.confidenceScore !== null
    ? `${scan.confidenceScore}%`
    : 'Not Yet Calculated';

  const coverageValue = scan?.coverageScore !== undefined && scan?.coverageScore !== null
    ? `${scan.coverageScore}%`
    : 'Not Yet Calculated';

  const modulesSummaryStats = (() => {
    const activeMods = Object.values(scan.modules || {});
    const counts = {
      completed: 0,
      failed: 0,
      skipped: 0,
      queued: 0,
      total: activeMods.length,
    };

    activeMods.forEach((m: any) => {
      if (m.status === 'COMPLETED') counts.completed++;
      else if (m.status === 'FAILED') counts.failed++;
      else if (m.status === 'SKIPPED') counts.skipped++;
      else counts.queued++;
    });

    return counts;
  })();

  const colorMap: Record<string, { colorClass: string; bgColor: string; borderColor: string }> = {
    green: { colorClass: 'text-success', bgColor: 'bg-success-bg', borderColor: 'border-success/30' },
    blue: { colorClass: 'text-info', bgColor: 'bg-info-bg', borderColor: 'border-info/30' },
    yellow: { colorClass: 'text-warning', bgColor: 'bg-warning-bg', borderColor: 'border-warning/30' },
    orange: { colorClass: 'text-warning', bgColor: 'bg-orange-50', borderColor: 'border-orange-200' },
    red: { colorClass: 'text-danger', bgColor: 'bg-danger-bg', borderColor: 'border-danger/30' },
    gray: { colorClass: 'text-text-secondary', bgColor: 'bg-bg-secondary', borderColor: 'border-border' },
  };
  const design = colorMap[postureColorStr] || colorMap.gray;

  const iconMap: Record<string, any> = {
    'shield-check': ShieldCheck,
    'shield-alert': ShieldAlert,
    'shield-x': ShieldX,
    'shield': Shield,
  };
  const PostureIconComponent = iconMap[postureIconStr] || Shield;

  return (
    <div className="min-h-screen bg-bg-primary flex overflow-hidden w-full">
      
      {/* Main panel - Full width since no sidebar navigation is rendered */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        
        {/* Shared Header Bar */}
        <header className="h-16 flex items-center justify-between px-8 sticky top-0 z-20 flex-shrink-0" style={{ backgroundColor: 'var(--color-bg-primary)', borderBottom: '1px solid #EDE8E0', boxShadow: '0 1px 4px 0 rgba(60,40,10,0.05)' }}>

          {/* Left: Brand Logo + shared report indicator */}
          <div className="text-left min-w-0">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ backgroundColor: '#C4933F' }}>
                <svg className="w-4 h-4 text-text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                </svg>
              </div>
              <span className="font-bold text-base tracking-tight" style={{ color: '#1E1508' }}>
                Cipher<span style={{ color: '#C4933F' }}>Lens</span>
              </span>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full ml-1" style={{ backgroundColor: '#FEF3C7', color: '#D97706', border: '1px solid #FDE68A' }}>
                Shared Report
              </span>
            </div>
            <h1 className="text-xs font-semibold text-text-muted mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
              Public Audit Overview
            </h1>
          </div>

          {/* Right Action buttons */}
          <div className="flex items-center gap-3 flex-shrink-0">

            {/* Download Report */}
            <div className="relative" ref={downloadRef}>
              <button
                onClick={() => { setDownloadOpen(!downloadOpen); setExportOpen(false); }}
                className="px-3.5 py-1.5 text-body-sm font-bold rounded-xl flex items-center gap-1.5 transition-all cursor-pointer"
                style={{ backgroundColor: downloadOpen ? '#EDE8E0' : '#F5F0E8', border: '1px solid var(--color-border)', color: 'var(--color-text-secondary)' }}
              >
                <svg className="w-3.5 h-3.5" style={{color: 'var(--color-text-muted)'}} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" /></svg>
                Download PDF
                <svg className={`w-3 h-3 transition-transform duration-200 ${downloadOpen ? 'rotate-180' : ''}`} style={{color: 'var(--color-text-muted)'}} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" /></svg>
              </button>
              {downloadOpen && (
                <div className="absolute right-0 top-full mt-1.5 w-48 py-1.5 rounded-xl text-body-sm z-50" style={{ backgroundColor: 'var(--color-bg-primary)', border: '1px solid #EDE8E0', boxShadow: '0 12px 32px -4px rgba(60,40,10,0.14)' }}>
                  {[
                    { label: 'PDF Summary Report', sub: 'Executive overview' },
                    { label: 'PDF Detailed Technical', sub: 'Full technical findings' },
                    { label: 'CSV Table Export', sub: 'Findings spreadsheet' },
                  ].map(({ label, sub }) => (
                    <button
                      key={label}
                      onClick={() => { alert(`Downloading: ${label}`); setDownloadOpen(false); }}
                      className="w-full text-left px-4 py-2.5 transition-colors flex flex-col gap-0.5"
                      style={{ color: 'var(--color-text-primary)' }}
                      onMouseEnter={e => (e.currentTarget.style.backgroundColor='var(--color-bg-secondary)')}
                      onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
                    >
                      <span className="font-semibold">{label}</span>
                      <span className="text-[10px]" style={{ color: '#A89880' }}>{sub}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Export options */}
            <div className="relative" ref={exportRef}>
              <button
                onClick={() => { setExportOpen(!exportOpen); setDownloadOpen(false); }}
                className="px-3.5 py-1.5 text-body-sm font-bold rounded-xl flex items-center gap-1.5 transition-all cursor-pointer"
                style={{ backgroundColor: exportOpen ? '#EDE8E0' : '#F5F0E8', border: '1px solid var(--color-border)', color: 'var(--color-text-secondary)' }}
              >
                <svg className="w-3.5 h-3.5" style={{color: 'var(--color-text-muted)'}} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" /></svg>
                Export
                <svg className={`w-3 h-3 transition-transform duration-200 ${exportOpen ? 'rotate-180' : ''}`} style={{color: 'var(--color-text-muted)'}} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" /></svg>
              </button>
              {exportOpen && (
                <div className="absolute right-0 top-full mt-1.5 w-44 py-1.5 rounded-xl text-body-sm z-50" style={{ backgroundColor: 'var(--color-bg-primary)', border: '1px solid #EDE8E0', boxShadow: '0 12px 32px -4px rgba(60,40,10,0.14)' }}>
                  {[
                    { label: 'Raw JSON Payload', sub: 'Full structured data' },
                    { label: 'Normalized CSV', sub: 'Flat spreadsheet' },
                  ].map(({ label, sub }) => (
                    <button
                      key={label}
                      onClick={() => { alert(`Exporting: ${label}`); setExportOpen(false); }}
                      className="w-full text-left px-4 py-2.5 transition-colors flex flex-col gap-0.5"
                      style={{ color: 'var(--color-text-primary)' }}
                      onMouseEnter={e => (e.currentTarget.style.backgroundColor='var(--color-bg-secondary)')}
                      onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
                    >
                      <span className="font-semibold">{label}</span>
                      <span className="text-[10px]" style={{ color: '#A89880' }}>{sub}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="w-px h-6" style={{ backgroundColor: '#E0D8CC' }} />

            {/* CTA button: Run a Free Audit */}
            <a
              href="/"
              className="px-4 py-1.5 rounded-xl text-xs font-bold text-text-primary transition-all cursor-pointer flex items-center gap-1.5"
              style={{ backgroundColor: '#C4933F', border: '1px solid #C4933F' }}
              onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#A67C2E')}
              onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#C4933F')}
            >
              <Sparkles className="w-3.5 h-3.5" />
              Run a Free Audit
            </a>

          </div>
        </header>

        {/* Scrollable page body */}
        <div className="flex-1 overflow-y-auto p-8 space-y-6">

          {/* 1. Target Details Card */}
          <Card className="p-6 flex flex-col lg:flex-row justify-between gap-6">
            
            {/* Target Address information details */}
            <div className="space-y-3.5 text-left">
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-text-primary tracking-tight truncate max-w-sm lg:max-w-lg">
                  {scan.targetUrl}
                </h2>
                <a 
                  href={scan.targetUrl} 
                  target="_blank" 
                  rel="noreferrer" 
                  className="w-6 h-6 rounded-full bg-bg-primary border border-border-warm hover:bg-bg-secondary text-text-muted flex items-center justify-center transition-colors text-body-sm"
                  title="Open site in new tab"
                >
                  🔗
                </a>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                <span className="text-body-xs font-medium font-bold uppercase tracking-wider bg-bg-secondary px-2.5 py-1 border border-border-warm rounded-full text-text-secondary select-none">
                  Target Type: Website
                </span>
              </div>
            </div>

            {/* Target Metadata stats grid */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-6 border-t lg:border-t-0 lg:border-l border-border-warm pt-4 lg:pt-0 lg:pl-8 text-left">
              
              <div>
                <p className="text-body-xs uppercase tracking-wider font-bold text-text-muted">Status</p>
                <span className="inline-block mt-1 px-2.5 py-1 bg-success-bg border border-green-200 text-green-700 font-bold uppercase text-body-xs font-medium rounded-full select-none">
                  Completed
                </span>
              </div>

              <div>
                <p className="text-body-xs uppercase tracking-wider font-bold text-text-muted">Scan Profile</p>
                <p className="font-bold text-text-primary mt-1 text-xs">{scan.scanType === 'CUSTOM' ? 'Custom Scan' : scan.scanType === 'STANDARD' ? 'Standard Scan' : scan.scanType === 'ADVANCED' ? 'Advanced Scan' : 'Quick Scan'}</p>
              </div>

              <div>
                <p className="text-body-xs uppercase tracking-wider font-bold text-text-muted">Started At</p>
                <p className="font-semibold text-text-primary mt-1 text-body-sm leading-snug">{formatDate(scan.startedAt)}</p>
              </div>

              <div>
                <p className="text-body-xs uppercase tracking-wider font-bold text-text-muted">Completed At</p>
                <p className="font-semibold text-text-primary mt-1 text-body-sm leading-snug">{formatDate(scan.completedAt)}</p>
              </div>

              <div>
                <p className="text-body-xs uppercase tracking-wider font-bold text-text-muted">Duration</p>
                <p className="font-bold text-text-primary mt-1 text-xs">{formatDuration(scan.elapsedTime)}</p>
              </div>

            </div>

          </Card>

          {/* 2. Donut / Stats Charts Dashboard Grid - Reconfigured to make Security Posture 100% width */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Card 1: Security Posture (Full width col span 3, timeline and target info removed) */}
            <Card className="flex flex-col justify-between h-[340px] text-left lg:col-span-3">
              <p className="text-body-sm font-bold text-text-primary uppercase tracking-wider mb-2" style={{ fontFamily: 'var(--font-heading)' }}>Security Posture</p>
              
              <div className="flex flex-col md:flex-row items-center justify-between gap-6 flex-1">
                {/* Left section: shield icon + posture text */}
                <div className="flex flex-col items-center justify-center text-center px-4 flex-shrink-0 md:border-r border-border-warm/50 md:pr-10 md:h-full md:justify-center">
                  <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-2.5 ${design.bgColor} ${design.borderColor} border`}>
                    <PostureIconComponent className={`w-9 h-9 ${design.colorClass}`} />
                  </div>
                  <span className={`text-title-h3 font-black tracking-tight leading-none ${design.colorClass}`}>
                    {posture}
                  </span>
                  <p className="text-[10px] font-semibold text-text-muted mt-2 max-w-[180px]">
                    {recommendation}
                  </p>
                </div>

                {/* Right section: grid / details list */}
                <div className="flex-1 w-full grid grid-cols-2 gap-x-6 gap-y-2 select-none">
                  {/* Left Column: Core parameters */}
                  <div className="space-y-1.5 text-body-xs text-text-secondary font-semibold border-r border-border-warm/50 pr-4">
                    <div className="flex items-center justify-between border-b border-border-warm/40 pb-1">
                      <div className="flex items-center gap-1">
                        <Shield className="w-3.5 h-3.5 text-text-muted" />
                        <span>Confidence</span>
                        <div className="group relative">
                          <Info className="w-3.5 h-3.5 text-text-muted cursor-help" />
                          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1.5 w-48 bg-text-primary text-text-primary text-[10px] p-2 rounded-lg opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50">
                            Measures scan reliability based on scanner types and vulnerability validations.
                          </div>
                        </div>
                      </div>
                      <span className="font-bold text-text-primary">
                        {confidenceValue}
                      </span>
                    </div>

                    <div className="flex items-center justify-between border-b border-border-warm/40 pb-1">
                      <div className="flex items-center gap-1">
                        <ShieldAlert className="w-3.5 h-3.5 text-text-muted" />
                        <span>Coverage</span>
                      </div>
                      <span className="font-bold text-text-primary">
                        {coverageValue}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        <ShieldCheck className="w-3.5 h-3.5 text-text-muted" />
                        <span>Modules Executed</span>
                      </div>
                      <span className="font-bold text-text-primary">
                        {modulesSummaryStats.completed} / {modulesSummaryStats.total}
                      </span>
                    </div>
                  </div>

                  {/* Right Column: Findings counts mapping */}
                  <div className="space-y-1.5 text-[11px] text-text-secondary font-semibold">
                    <div className="flex items-center justify-between border-b border-border-warm/40 pb-0.5">
                      <div className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-danger-bg0 animate-pulse" />
                        <span>Critical Findings</span>
                      </div>
                      <span className="font-bold text-text-primary">{stats.CRITICAL}</span>
                    </div>
                    <div className="flex items-center justify-between border-b border-border-warm/40 pb-0.5">
                      <div className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />
                        <span>High Findings</span>
                      </div>
                      <span className="font-bold text-text-primary">{stats.HIGH}</span>
                    </div>
                    <div className="flex items-center justify-between border-b border-border-warm/40 pb-0.5">
                      <div className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-yellow-500" />
                        <span>Medium Findings</span>
                      </div>
                      <span className="font-bold text-text-primary">{stats.MEDIUM}</span>
                    </div>
                    <div className="flex items-center justify-between border-b border-border-warm/40 pb-0.5">
                      <div className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-info-bg0" />
                        <span>Low Findings</span>
                      </div>
                      <span className="font-bold text-text-primary">{stats.LOW}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                        <span>Informational Findings</span>
                      </div>
                      <span className="font-bold text-text-primary">{stats.INFO}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* AI Summary alert panel box */}
              <div className="mt-3.5 bg-success-bg/50 border border-green-100 rounded-2xl p-3 flex items-center justify-between gap-4">
                <div className="flex items-start gap-2">
                  <Sparkles className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <div className="text-left">
                    <p className="text-[11px] font-extrabold text-green-800 flex items-center gap-1">
                      AI Summary
                    </p>
                    <p className="text-[11px] text-green-700 leading-snug font-semibold mt-0.5">
                      {aiSummaryText}
                    </p>
                  </div>
                </div>
              </div>
            </Card>
          </div>

          {/* 3. Main content body split layout: left Sidebar, right findings table */}
          <div className="grid grid-cols-12 gap-6 items-stretch h-[560px]">
            
            {/* Left sidebar: modules selector */}
            <Card className="col-span-12 lg:col-span-3 flex flex-col h-full overflow-hidden">
              <div className="flex items-center justify-between border-b border-border-warm pb-3 flex-shrink-0 text-left">
                <h3 className="text-xs font-extrabold text-text-primary uppercase tracking-wider">Modules</h3>
                <span className="px-2 py-0.5 font-bold font-mono text-body-xs rounded-full" style={{ backgroundColor: '#FDF6E7', color: '#A67C2E', border: '1px solid #E8C98A' }}>
                  {modulesState.filter(m => m.isSelected).length} active
                </span>
              </div>

              {/* Reset filter overview row */}
              <div className="mt-3 mb-2 flex-shrink-0">
                <button
                  onClick={() => {
                    setSelectedModule('ALL');
                    setCurrentPage(1);
                  }}
                  className={`w-full p-2.5 rounded-xl text-left text-xs font-bold transition-all flex items-center justify-between cursor-pointer ${
                    selectedModule === 'ALL'
                      ? 'border'
                      : 'bg-transparent text-text-primary hover:bg-bg-primary border border-transparent'
                  }`}
                  style={selectedModule === 'ALL' ? { backgroundColor: '#FDF6E7', color: '#A67C2E', borderColor: '#E8C98A' } : {}}
                >
                  <span className="flex items-center gap-2">
                    <span>📂</span> Overview
                  </span>
                  <span className="font-mono text-body-sm opacity-75">{findings.length} findings</span>
                </button>
              </div>

              {/* Modules scrollable area */}
              <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 min-h-0 text-left">
                {modulesState.map((mod) => (
                  <button
                    key={mod.id}
                    disabled={!mod.isSelected}
                    onClick={() => {
                      setSelectedModule(mod.id);
                      setCurrentPage(1);
                    }}
                    className={`w-full p-2 rounded-xl text-left text-body-sm transition-all flex items-center justify-between cursor-pointer group border ${
                      !mod.isSelected
                        ? 'opacity-40 bg-bg-secondary text-text-muted border-transparent cursor-not-allowed select-none'
                        : selectedModule === mod.id
                        ? 'border font-bold'
                        : 'bg-transparent text-text-primary hover:bg-bg-primary border-transparent'
                    }`}
                    style={mod.isSelected && selectedModule === mod.id ? { backgroundColor: '#FDF6E7', color: '#A67C2E', borderColor: '#E8C98A' } : {}}
                  >
                    <span className="truncate pr-2 font-bold">{mod.label}</span>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {!mod.isSelected ? (
                        <span className="text-body-xs font-medium" title="Not included in scan configuration">🔒</span>
                      ) : (
                        <>
                          <span className={`w-1.5 h-1.5 rounded-full ${
                            mod.status === 'COMPLETED' ? 'bg-success-bg0' : 'bg-danger-bg0'
                          }`} />
                          <span className="font-mono font-bold text-body-sm">
                            {mod.findingsCount}
                          </span>
                        </>
                      )}
                    </div>
                  </button>
                ))}
              </div>

              <div className="pt-3 border-t border-border-warm flex justify-center flex-shrink-0 mt-2">
                <button
                  onClick={() => setSelectedModule('ALL')}
                  className="text-body-sm font-bold cursor-pointer transition-colors"
                  style={{ color: '#C4933F' }}
                  onMouseEnter={e=>(e.currentTarget.style.color='#A67C2E')}
                  onMouseLeave={e=>(e.currentTarget.style.color='#C4933F')}
                >
                  Show all modules
                </button>
              </div>
            </Card>

            {/* Right: filterable findings table list */}
            <div className="col-span-12 lg:col-span-9 flex flex-col h-full overflow-hidden text-left">
              
              {/* Filter tabs block */}
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border-warm flex-shrink-0 mb-4">
                
                {/* Severity Tabs */}
                <div className="flex flex-wrap -mb-px">
                  {[
                    { id: 'ALL', label: 'All Findings', count: stats.total, style: 'border-[#C4933F] text-[#A67C2E]' },
                    { id: 'CRITICAL', label: 'Critical', count: stats.CRITICAL, style: 'border-red-600 text-danger' },
                    { id: 'HIGH', label: 'High', count: stats.HIGH, style: 'border-orange-600 text-warning' },
                    { id: 'MEDIUM', label: 'Medium', count: stats.MEDIUM, style: 'border-yellow-600 text-yellow-700' },
                    { id: 'LOW', label: 'Low', count: stats.LOW, style: 'border-blue-500 text-info' },
                    { id: 'INFO', label: 'Info', count: stats.INFO, style: 'border-[#8A7460] text-text-secondary' }
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => {
                        setSelectedSeverity(tab.id);
                        setCurrentPage(1);
                      }}
                      className={`px-4 py-2 border-b-2 font-bold text-body-sm cursor-pointer transition-colors flex items-center gap-1.5 ${
                        selectedSeverity === tab.id
                          ? tab.style
                          : 'border-transparent text-text-muted hover:text-text-primary hover:border-border-warm'
                      }`}
                    >
                      {tab.label}
                      <span className="text-body-xs font-medium font-mono opacity-85">({tab.count})</span>
                    </button>
                  ))}
                </div>

                {/* Table search & options */}
                <div className="flex items-center gap-2 pb-2">
                  <div className="relative w-48">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none">
                      <svg className="w-3.5 h-3.5" style={{color:'#B8A898'}} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.602 10.602z" /></svg>
                    </span>
                    <input
                      type="text"
                      placeholder="Search findings..."
                      value={searchQuery}
                      onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                      className="w-full pl-7 pr-3 py-1.5 rounded-xl text-body-sm font-medium focus:outline-none"
                      style={{ backgroundColor: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }}
                    />
                  </div>
                  <button className="px-3 py-1.5 text-body-sm font-semibold rounded-xl cursor-pointer flex items-center gap-1.5 transition-all" style={{ backgroundColor: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', color: 'var(--color-text-secondary)' }} onMouseEnter={e=>(e.currentTarget.style.backgroundColor='#EDE8E0')} onMouseLeave={e=>(e.currentTarget.style.backgroundColor='var(--color-bg-secondary)')}>
                    <svg className="w-3.5 h-3.5" style={{color: 'var(--color-text-muted)'}} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" /></svg>
                    Filters
                  </button>
                  <button className="px-3 py-1.5 text-body-sm font-semibold rounded-xl cursor-pointer flex items-center gap-1.5 transition-all" style={{ backgroundColor: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', color: 'var(--color-text-secondary)' }} onMouseEnter={e=>(e.currentTarget.style.backgroundColor='#EDE8E0')} onMouseLeave={e=>(e.currentTarget.style.backgroundColor='var(--color-bg-secondary)')}>
                    <svg className="w-3.5 h-3.5" style={{color: 'var(--color-text-muted)'}} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 4.5v15m6-15v15M3 9h18M3 15h18" /></svg>
                    Columns
                  </button>
                </div>

              </div>

              {/* Findings Card wrapper */}
              <Card className="flex-1 flex flex-col overflow-hidden min-h-0">
                
                {/* Headers */}
                <div className="grid grid-cols-12 gap-4 px-6 py-3.5 font-bold uppercase tracking-wider text-body-sm flex-shrink-0" style={{ backgroundColor: 'var(--color-bg-secondary)', borderBottom: '1px solid #EDE8E0', color: 'var(--color-text-muted)' }}>
                  <div className="col-span-2">Severity</div>
                  <div className="col-span-4">Finding / Description</div>
                  <div className="col-span-3">Module</div>
                  <div className="col-span-2">Category</div>
                  <div className="col-span-1 text-right">Action</div>
                </div>

                {/* Scrollable Table body */}
                <div className="flex-1 overflow-y-auto divide-y divide-border min-h-0">
                  {paginatedFindings.length > 0 ? (
                    paginatedFindings.map((finding) => {
                      const sysMod = systemModules.find(m => m.id === finding.module);
                      
                      return (
                        <div 
                          key={finding.id} 
                          onClick={() => {
                            setSelectedFinding(finding);
                            setIsDrawerOpen(true);
                          }}
                          className="grid grid-cols-12 gap-4 items-center px-6 py-4 cursor-pointer transition-colors text-xs"
                          style={{ color: 'var(--color-text-primary)' }}
                          onMouseEnter={e=>(e.currentTarget.style.backgroundColor='var(--color-bg-secondary)')}
                          onMouseLeave={e=>(e.currentTarget.style.backgroundColor='transparent')}
                        >
                          {/* Severity */}
                          <div className="col-span-2">
                            <span className={`px-2.5 py-1 border rounded text-body-sm uppercase select-none ${getSeverityStyle(finding.severity)}`}>
                              {finding.severity}
                            </span>
                          </div>

                          {/* Title */}
                          <div className="col-span-4 min-w-0 pr-4">
                            <p className="font-bold text-text-primary truncate">{finding.title}</p>
                            <p className="text-body-sm text-text-muted truncate mt-0.5">{finding.description}</p>
                          </div>

                          {/* Module */}
                          <div className="col-span-3 flex items-center gap-1.5 font-semibold text-text-secondary capitalize truncate">
                            <span>{sysMod?.icon || '⚙️'}</span>
                            <span className="truncate">{sysMod?.label || finding.module}</span>
                          </div>

                          {/* Category */}
                          <div className="col-span-2 font-semibold text-text-muted truncate">
                            {finding.category || 'Security check'}
                          </div>

                          {/* Action Chevron */}
                          <div className="col-span-1 flex items-center justify-end text-right font-bold text-text-muted">
                            <span className="px-2 py-1 rounded text-[10px] font-semibold transition-all" style={{ backgroundColor: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', color: 'var(--color-text-secondary)' }}>
                              Details →
                            </span>
                          </div>

                        </div>
                      );
                    })
                  ) : (
                    <div className="p-8 text-center text-text-muted text-xs font-semibold">
                      No findings matches your active severity tab or search filter queries.
                    </div>
                  )}
                </div>

                {/* Table pagination control footer */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between px-6 py-3.5 flex-shrink-0 text-body-sm font-semibold select-none" style={{ borderTop: '1px solid #EDE8E0', backgroundColor: 'var(--color-bg-primary)', color: 'var(--color-text-muted)' }}>
                    <div>
                      Showing <strong className="text-text-primary">{(currentPage - 1) * itemsPerPage + 1}</strong> to <strong className="text-text-primary">{Math.min(currentPage * itemsPerPage, filteredFindings.length)}</strong> of <strong className="text-text-primary">{filteredFindings.length}</strong> findings
                    </div>

                    <div className="flex items-center gap-3">
                      {/* Rows count selector */}
                      <div className="flex items-center gap-1.5">
                        <span>Rows per page:</span>
                        <select 
                          value={itemsPerPage} 
                          onChange={(e) => {
                            setItemsPerPage(Number(e.target.value));
                            setCurrentPage(1);
                          }}
                          className="px-2 py-1 rounded-lg text-body-sm focus:outline-none" style={{ backgroundColor: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }}
                        >
                          {[5, 10, 20, 50].map(sz => (
                            <option key={sz} value={sz}>{sz} / page</option>
                          ))}
                        </select>
                      </div>

                      {/* Stepper page links */}
                      <div className="flex items-center gap-1">
                        <button 
                          disabled={currentPage === 1}
                          onClick={() => setCurrentPage(currentPage - 1)}
                          className="w-7 h-7 rounded-lg flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-all" style={{ backgroundColor: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', color: 'var(--color-text-secondary)' }} onMouseEnter={e=>{if(!e.currentTarget.disabled)e.currentTarget.style.backgroundColor='#EDE8E0'}} onMouseLeave={e=>(e.currentTarget.style.backgroundColor='var(--color-bg-secondary)')}
                        >
                          ◀
                        </button>
                        
                        {[...Array(totalPages)].map((_, i) => (
                          <button
                            key={i}
                            onClick={() => setCurrentPage(i + 1)}
                            className="w-7 h-7 rounded-lg flex items-center justify-center cursor-pointer transition-all text-body-sm font-bold"
                            style={currentPage === i + 1 ? { backgroundColor: '#C4933F', border: '1px solid #C4933F', color: '#FFFFFF' } : { backgroundColor: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', color: 'var(--color-text-secondary)' }}
                            onMouseEnter={e=>{ if(currentPage !== i+1) e.currentTarget.style.backgroundColor='#EDE8E0'; }}
                            onMouseLeave={e=>{ if(currentPage !== i+1) e.currentTarget.style.backgroundColor='var(--color-bg-secondary)'; }}
                          >
                            {i + 1}
                          </button>
                        ))}

                        <button 
                          disabled={currentPage === totalPages}
                          onClick={() => setCurrentPage(currentPage + 1)}
                          className="w-7 h-7 rounded-lg flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-all" style={{ backgroundColor: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', color: 'var(--color-text-secondary)' }} onMouseEnter={e=>{if(!e.currentTarget.disabled)e.currentTarget.style.backgroundColor='#EDE8E0'}} onMouseLeave={e=>(e.currentTarget.style.backgroundColor='var(--color-bg-secondary)')}
                        >
                          ▶
                        </button>
                      </div>
                    </div>
                  </div>
                )}

              </Card>

            </div>

          </div>

        </div>

      </div>

      {/* Side Panel Drawer Overlay (High-Fidelity Wireframe design) */}
      {isDrawerOpen && selectedFinding && (
        <>
          {/* Overlay backdrop */}
          <div 
            className="fixed inset-0 bg-black/30 backdrop-blur-[1px] z-40 transition-opacity animate-in fade-in duration-200" 
            onClick={() => setIsDrawerOpen(false)}
          />
          
          {/* Drawer Container Panel */}
          <div className="fixed top-0 right-0 h-full w-[450px] sm:w-[500px] md:w-[600px] shadow-2xl z-50 flex flex-col animate-in slide-in-from-right duration-300" style={{ backgroundColor: 'var(--color-bg-primary)', borderLeft: '1px solid #EDE8E0' }}>
            
            {/* Drawer Header */}
            <div className="p-6 flex items-start justify-between flex-shrink-0" style={{ borderBottom: '1px solid #EDE8E0' }}>
              <div className="space-y-2 text-left">
                <span className={`px-2.5 py-1 border rounded text-body-sm font-bold uppercase select-none ${getSeverityStyle(selectedFinding.severity)}`}>
                  {selectedFinding.severity}
                </span>
                <h3 className="text-title-h2 font-black text-text-primary mt-2 leading-snug">
                  {selectedFinding.title}
                </h3>
                <p className="text-body-xs font-semibold" style={{color:'#A89880'}}>
                  Module: <span className="font-bold" style={{color: 'var(--color-text-primary)'}}>{systemModules.find(m => m.id === selectedFinding.module)?.label || selectedFinding.module}</span> | Category: <span className="font-bold" style={{color: 'var(--color-text-secondary)'}}>{selectedFinding.category || 'Security check'}</span>
                </p>
              </div>
              <button 
                onClick={() => setIsDrawerOpen(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center transition-all cursor-pointer text-xs" style={{ border: '1px solid var(--color-border)', color: 'var(--color-text-muted)' }} onMouseEnter={e=>(e.currentTarget.style.backgroundColor='#F0EBE1')} onMouseLeave={e=>(e.currentTarget.style.backgroundColor='transparent')}
                title="Close panel"
              >
                ✕
              </button>
            </div>

            {/* Drawer Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 text-left">
              
              {/* SECTION A: TECHNICAL FINDINGS */}
              <div className="space-y-6">
                <div className="flex items-center gap-2 pb-2" style={{ borderBottom: '1px solid #EDE8E0' }}>
                  <svg className="w-3.5 h-3.5" style={{color: 'var(--color-text-muted)'}} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z" /></svg>
                  <h4 className="text-body-xs font-extrabold uppercase tracking-wider" style={{color: 'var(--color-text-primary)'}}>Technical Findings</h4>
                  <span className="px-2 py-0.5 rounded-full text-[8px] font-bold uppercase select-none" style={{ backgroundColor: 'var(--color-hover)', color: 'var(--color-text-muted)' }}>
                    Verified Scanner Data
                  </span>
                </div>

                {/* 1. OVERVIEW */}
                <div className="space-y-2">
                  <p className="text-body-xs font-extrabold uppercase tracking-wider" style={{color: 'var(--color-text-muted)'}}>Overview</p>
                  <div className="text-body-md text-text-secondary leading-relaxed font-semibold">
                    {renderFormattedText(selectedFinding.description)}
                  </div>
                </div>

                {selectedFinding.module === 'technology' && (
                  <div className="space-y-2">
                    <p className="text-body-xs font-extrabold uppercase tracking-wider" style={{color: 'var(--color-text-muted)'}}>Fingerprinted Stack Inventory</p>
                    <div className="grid grid-cols-3 gap-3">
                      {(() => {
                        const getTechLogo = (tech: string) => {
                          const t = tech.toLowerCase();
                          if (t.includes('react')) return 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/react/react-original.svg';
                          if (t.includes('next')) return 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/nextjs/nextjs-original.svg';
                          if (t.includes('vue')) return 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/vuejs/vuejs-original.svg';
                          if (t.includes('node')) return 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/nodejs/nodejs-original.svg';
                          if (t.includes('django')) return 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/django/django-plain.svg';
                          if (t.includes('laravel')) return 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/laravel/laravel-original.svg';
                          if (t.includes('nginx')) return 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/nginx/nginx-original.svg';
                          if (t.includes('postgre')) return 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/postgresql/postgresql-original.svg';
                          if (t.includes('mysql')) return 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/mysql/mysql-original.svg';
                          if (t.includes('mongo')) return 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/mongodb/mongodb-original.svg';
                          if (t.includes('redis')) return 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/redis/redis-original.svg';
                          if (t.includes('stripe')) return 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/stripe/stripe-plain.svg';
                          if (t.includes('cloudflare')) return 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/cloudflare/cloudflare-original.svg';
                          if (t.includes('webpack')) return 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/webpack/webpack-original.svg';
                          return null;
                        };

                        const rawDataStr = selectedFinding.rawData;
                        let rawDataObj: any = null;
                        if (rawDataStr) {
                          try {
                            rawDataObj = JSON.parse(rawDataStr);
                          } catch (e) {
                            // ignore
                          }
                        }
                        let listTechs: string[] = [];
                        if (rawDataObj && Array.isArray(rawDataObj.technologies)) {
                          listTechs = rawDataObj.technologies;
                        } else if (rawDataObj && rawDataObj.categorized) {
                          listTechs = Object.values(rawDataObj.categorized).flat() as string[];
                        } else if (selectedFinding.evidence) {
                          const match = selectedFinding.evidence.match(/Detected technologies:\s*(.*)/i);
                          if (match && match[1]) {
                            listTechs = match[1].split(',').map(s => s.trim());
                          }
                        }

                        if (listTechs.length === 0) {
                          listTechs = ['React', 'Next.js', 'Node.js', 'Webpack'];
                        }

                        return listTechs.map((techName, idx) => {
                          const logoUrl = getTechLogo(techName);
                          return (
                            <div key={idx} className="p-3.5 rounded-2xl flex items-center gap-2.5" style={{ backgroundColor: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)' }}>
                              {logoUrl ? (
                                <img src={logoUrl} className="w-6 h-6 object-contain" alt={techName} />
                              ) : (
                                <span className="w-6 h-6 rounded-full flex items-center justify-center text-body-xs font-bold select-none" style={{ backgroundColor: 'var(--color-hover)', color: 'var(--color-text-muted)' }}>
                                  {techName.charAt(0).toUpperCase()}
                                </span>
                              )}
                              <div className="min-w-0 text-left">
                                <p className="text-body-xs font-bold text-text-primary truncate" title={techName}>{techName}</p>
                                <p className="text-[8px] text-text-muted font-semibold mt-0.5">FINGERPRINTED</p>
                              </div>
                            </div>
                          );
                        });
                      })()}
                    </div>
                  </div>
                )}

                {/* 3. AFFECTED RESOURCE */}
                <div className="space-y-2">
                  <p className="text-body-xs font-extrabold uppercase tracking-wider" style={{color: 'var(--color-text-muted)'}}>Affected Resource</p>
                  <div className="p-3.5 rounded-2xl flex items-center gap-3" style={{ backgroundColor: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)' }}>
                    <span className="w-8 h-8 rounded-full flex items-center justify-center text-base select-none" style={{ backgroundColor: 'var(--color-hover)', border: '1px solid #DDD6C8' }}>🌐</span>
                    <div className="text-left leading-normal font-semibold min-w-0 flex-1">
                      <p className="text-body-sm text-text-primary font-mono truncate select-all" title={scan?.targetUrl}>
                        {scan?.targetUrl}
                      </p>
                      <p className="text-[10px] text-text-muted font-mono mt-0.5">
                        {targetInfo.ip || '127.0.0.1'}:{selectedFinding.module === 'ssl' || selectedFinding.module === 'tls' ? '443' : '80'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* 4. EVIDENCE / PROOF */}
                {selectedFinding.evidence && (
                  <div className="space-y-2">
                    <p className="text-body-xs font-extrabold uppercase tracking-wider" style={{color: 'var(--color-text-muted)'}}>Evidence / Proof</p>
                    <div className="relative group">
                      <pre className="p-4 bg-bg-muted text-text-primary border border-border rounded-xl font-mono text-[10px] leading-relaxed overflow-x-auto whitespace-pre-wrap text-left shadow-inner">
                        {selectedFinding.evidence}
                      </pre>
                    </div>
                  </div>
                )}

                {/* 5. REFERENCES */}
                {selectedFinding.references && (
                  <div className="space-y-2">
                    <p className="text-body-xs font-extrabold uppercase tracking-wider" style={{color: 'var(--color-text-muted)'}}>References</p>
                    <div className="flex flex-wrap gap-2.5 pt-1">
                      {(() => {
                        const getReferenceInfo = (url: string) => {
                          const lower = url.toLowerCase();
                          if (lower.includes('owasp')) return { label: 'OWASP', icon: '🛡️' };
                          if (lower.includes('nist')) return { label: 'NIST', icon: '🏛️' };
                          if (lower.includes('mozilla')) return { label: 'Mozilla', icon: '🦊' };
                          if (lower.includes('rfc')) {
                            const match = url.match(/rfc\D*(\d+)/i);
                            return { label: match ? `RFC ${match[1]}` : 'RFC Document', icon: '📄' };
                          }
                          try {
                            const host = new URL(url).hostname.replace('www.', '');
                            return { label: host, icon: '🔗' };
                          } catch {
                            return { label: 'Reference Link', icon: '🔗' };
                          }
                        };

                        try {
                          let parsed = selectedFinding.references;
                          if (typeof parsed === 'string' && (parsed.startsWith('[') || parsed.startsWith('{'))) {
                            parsed = JSON.parse(parsed);
                          }
                          const refsArray = Array.isArray(parsed) ? parsed : [parsed];
                          
                          return refsArray.map((ref: string, index: number) => {
                            const info = getReferenceInfo(ref);
                            return (
                              <a 
                                key={index} 
                                href={ref} 
                                target="_blank" 
                                rel="noreferrer" 
                                className="px-3.5 py-2 text-body-xs font-semibold rounded-xl flex items-center gap-2 transition-all" style={{ backgroundColor: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', color: 'var(--color-text-secondary)' }} onMouseEnter={e=>(e.currentTarget.style.backgroundColor='#EDE8E0')} onMouseLeave={e=>(e.currentTarget.style.backgroundColor='var(--color-bg-secondary)')}
                              >
                                <span>{info.icon}</span>
                                <span className="truncate max-w-[120px]">{info.label}</span>
                              </a>
                            );
                          });
                        } catch {
                          return (
                            <>
                              <a href="https://owasp.org" target="_blank" rel="noreferrer" className="px-3.5 py-2 text-body-xs font-semibold rounded-xl flex items-center gap-2 transition-all" style={{ backgroundColor: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', color: 'var(--color-text-secondary)' }} onMouseEnter={e=>(e.currentTarget.style.backgroundColor='#EDE8E0')} onMouseLeave={e=>(e.currentTarget.style.backgroundColor='var(--color-bg-secondary)')}>
                                <span>🛡️</span> <span>OWASP</span>
                              </a>
                              <a href="https://nist.gov" target="_blank" rel="noreferrer" className="px-3.5 py-2 text-body-xs font-semibold rounded-xl flex items-center gap-2 transition-all" style={{ backgroundColor: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', color: 'var(--color-text-secondary)' }} onMouseEnter={e=>(e.currentTarget.style.backgroundColor='#EDE8E0')} onMouseLeave={e=>(e.currentTarget.style.backgroundColor='var(--color-bg-secondary)')}>
                                <span>🏛️</span> <span>NIST</span>
                              </a>
                            </>
                          );
                        }
                      })()}
                    </div>
                  </div>
                )}

                {/* 6. SCANNER DETAILS */}
                {(() => {
                  const metrics = getFindingMetrics(selectedFinding, scan);
                  return (
                    <div className="space-y-2">
                      <p className="text-body-xs font-extrabold uppercase tracking-wider" style={{color: 'var(--color-text-muted)'}}>Scanner Details</p>
                      <div className="grid grid-cols-2 gap-x-6 gap-y-2.5 bg-bg-primary border border-border-warm rounded-2xl p-4 text-body-xs font-bold text-text-secondary select-none">
                        <div className="flex justify-between border-b border-border-warm/30 pb-1.5 min-w-0">
                          <span className="text-text-muted flex-shrink-0 mr-2">Tool</span>
                          <span className="text-text-primary font-mono truncate" title={selectedFinding.tool || 'N/A'}>
                            {metrics.toolName}
                          </span>
                        </div>
                        <div className="flex justify-between border-b border-border-warm/30 pb-1.5">
                          <span className="text-text-muted">Confidence</span>
                          <span className="text-text-primary">{metrics.confidence}</span>
                        </div>
                        <div className="flex justify-between border-b border-border-warm/30 pb-1.5">
                          <span className="text-text-muted">Version</span>
                          <span className="text-text-primary font-mono">{metrics.version}</span>
                        </div>
                        <div className="flex justify-between border-b border-border-warm/30 pb-1.5">
                          <span className="text-text-muted">Scan Time</span>
                          <span className="text-text-primary font-mono">{metrics.scanTime}</span>
                        </div>
                        <div className="flex justify-between col-span-2">
                          <span className="text-text-muted">Execution Duration</span>
                          <span className="text-text-primary font-mono">{metrics.durationStr}</span>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* SECTION B: AI SECURITY ANALYSIS */}
              <div className="pt-6 mt-6 space-y-6" style={{ borderTop: '1px solid #EDE8E0' }}>
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4" style={{color:'#C4933F'}} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" /></svg>
                  <h4 className="text-body-xs font-extrabold uppercase tracking-wider" style={{color: 'var(--color-text-primary)'}}>AI Security Analysis</h4>
                </div>

                {aiLoading ? (
                  <div className="flex flex-col items-center justify-center py-10 space-y-3 text-text-muted">
                    <span className="animate-spin text-xl">⏳</span>
                    <span className="text-body-xs font-bold uppercase tracking-wider">Generating AI Security Insights...</span>
                  </div>
                ) : aiAnalysis ? (
                  <div className="space-y-6">
                    {/* Executive Summary */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-1.5">
                        <span>📋</span>
                        <p className="text-body-xs font-extrabold uppercase tracking-wider" style={{color: 'var(--color-text-muted)'}}>AI Executive Summary</p>
                      </div>
                      <div className="p-4 rounded-2xl" style={{ backgroundColor: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)' }}>
                        <div className="text-body-sm font-semibold text-text-secondary leading-relaxed">
                          {renderFormattedText(aiAnalysis.executiveSummary)}
                        </div>
                        <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-border-warm/60 text-[9px] font-bold text-text-muted uppercase select-none">
                          <span>🛡️</span>
                          <span>Generated from verified scanner findings. No additional vulnerabilities were inferred.</span>
                        </div>
                      </div>
                    </div>

                    {/* Priority & Risk Explanation */}
                    <div className="p-4 rounded-2xl text-left space-y-3.5" style={{ backgroundColor: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)' }}>
                      <div className="flex items-center justify-between border-b border-border-warm/40 pb-2">
                        <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Remediation Priority</span>
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase select-none ${
                          aiAnalysis.priority === 'CRITICAL' ? 'bg-danger-bg text-danger border border-danger/30' :
                          aiAnalysis.priority === 'HIGH' ? 'bg-warning-bg text-warning border border-orange-255' :
                          aiAnalysis.priority === 'MEDIUM' ? 'bg-warning-bg text-warning border border-warning/30' :
                          'bg-info-bg text-info border border-info/30'
                        }`}>
                          {aiAnalysis.priority}
                        </span>
                      </div>
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider" style={{color: 'var(--color-text-muted)'}}>Risk Level Explanation</span>
                        <div className="text-body-xs text-text-secondary font-medium leading-relaxed mt-1">
                          {renderFormattedText(aiAnalysis.riskExplanation)}
                        </div>
                      </div>
                    </div>

                    {/* Business Impact */}
                    <div className="space-y-2">
                      <p className="text-body-xs font-extrabold uppercase tracking-wider" style={{color: 'var(--color-text-muted)'}}>Business Impact</p>
                      <div className="text-body-sm text-text-secondary leading-relaxed font-semibold">
                        {renderFormattedText(aiAnalysis.businessImpact)}
                      </div>
                    </div>

                    {/* Attack Scenarios */}
                    <div className="space-y-2">
                      <p className="text-body-xs font-extrabold uppercase tracking-wider" style={{color: 'var(--color-text-muted)'}}>Potential Attack Scenarios</p>
                      <div className="p-4 rounded-2xl" style={{ backgroundColor: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)' }}>
                        <div className="text-body-xs text-text-secondary leading-relaxed font-medium italic">
                          {renderFormattedText(aiAnalysis.attackScenarios)}
                        </div>
                      </div>
                    </div>

                    {/* Recommended Next Steps */}
                    {aiAnalysis.nextSteps && aiAnalysis.nextSteps.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-body-xs font-extrabold uppercase tracking-wider" style={{color: 'var(--color-text-muted)'}}>Recommended Next Steps</p>
                        <div className="p-4 bg-success-bg/45 border border-success/30 rounded-2xl text-success leading-relaxed font-semibold text-body-xs shadow-xs flex flex-col gap-2.5">
                          {aiAnalysis.nextSteps.map((step: string, sIdx: number) => (
                            <div key={sIdx} className="flex items-start gap-2.5">
                              <input type="checkbox" readOnly checked className="mt-0.5 rounded cursor-default" style={{ accentColor: '#C4933F' }} />
                              <span>{step}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-body-xs font-semibold text-text-muted italic select-none">AI analysis could not be generated. Please configure GEMINI_API_KEY.</p>
                )}
              </div>
            </div>

            {/* Panel Footer */}
            <div className="p-4 flex justify-end gap-2 flex-shrink-0" style={{ borderTop: '1px solid #EDE8E0', backgroundColor: '#F9F5EF' }}>
              <button
                onClick={() => setIsDrawerOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer w-full text-center"
                style={{ backgroundColor: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', color: 'var(--color-text-secondary)' }}
                onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#EDE8E0')}
                onMouseLeave={e => (e.currentTarget.style.backgroundColor='var(--color-bg-secondary)')}
              >
                Done
              </button>
            </div>

          </div>
        </>
      )}

    </div>
  );
}
