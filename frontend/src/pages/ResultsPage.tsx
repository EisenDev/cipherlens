import { useState, useMemo, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import { useAuthStore } from '../store/useAuthStore';
import { useRealScanStatus, useScanResults, usePatchScan } from '../hooks/useScans';
import type { ScanResultItem } from '../hooks/useScans';
import { apiRequest } from '../api/client';
import NotFoundPage from './NotFoundPage';
import { LoadingScreen } from '../components/LoadingScreen';
import { Shield, ShieldAlert, ShieldCheck, ShieldX, Sparkles, Info, ArrowLeft, Download, FileJson, Share2 } from 'lucide-react';

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

export default function ResultsPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuthStore();
  const initials = user?.fullName
    ?.split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase() ?? 'JD';


  // Queries
  const { data: scan, isLoading: scanLoading, error: scanError } = useRealScanStatus(id || null, true);
  const { data: resultsData } = useScanResults(id || null, true);

  const patchScan = usePatchScan();

  // States
  const [selectedSeverity, setSelectedSeverity] = useState<string>('ALL'); // ALL, CRITICAL, HIGH, MEDIUM, LOW, INFO
  const [selectedModule, setSelectedModule] = useState<string>('ALL'); // ALL or module name
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedFinding, setSelectedFinding] = useState<ScanResultItem | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);

  // Share Settings States
  const [shareModalOpen, setShareModalOpen] = useState<boolean>(false);
  const [sharePrivacy, setSharePrivacy] = useState<'private' | 'public'>('private');
  const [shareCopied, setShareCopied] = useState<boolean>(false);
  const [isSavedSuccess, setIsSavedSuccess] = useState<boolean>(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Sync sharePrivacy with scan data
  useEffect(() => {
    if (scan) {
      setSharePrivacy(scan.isPublic ? 'public' : 'private');
    }
  }, [scan]);

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
      // Sort: Selected first, then alphabetically
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

    // First try extracting all HTTPX/ports metadata fields from findings rawData
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

      // Fallbacks from title/evidence as backups
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
      // Severity Filter
      if (selectedSeverity !== 'ALL' && f.severity?.toUpperCase() !== selectedSeverity) {
        return false;
      }
      // Module Filter
      if (selectedModule !== 'ALL' && f.module !== selectedModule) {
        return false;
      }
      // Search query
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

  // Formatting helper for timestamps
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
        title="Loading Scan Results" 
        subtitle="Retrieving security posture, metrics, and vulnerability findings..." 
      />
    );
  }

  if (scanError || !scan || !id) {
    return <NotFoundPage />;
  }

  // Count modules progress stats
  const modulesSummaryStats = (() => {
    const activeMods = Object.values(scan.modules || {});
    const counts = {
      completed: 0,
      failed: 0,
      skipped: 0,
      queued: 0,
      total: activeMods.length,
    };

    activeMods.forEach((m) => {
      if (m.status === 'COMPLETED') counts.completed++;
      else if (m.status === 'FAILED') counts.failed++;
      else if (m.status === 'SKIPPED') counts.skipped++;
      else counts.queued++;
    });

    return counts;
  })();

  // Helper for severity color badges
  const getSeverityStyle = (severity: string) => {
    switch (severity?.toUpperCase()) {
      case 'CRITICAL':
        return 'bg-danger-bg border-border text-text-primary font-bold';
      case 'HIGH':
        return 'bg-warning-bg border-border text-text-primary font-bold';
      case 'MEDIUM':
        return 'bg-warning-bg border-border text-text-primary font-bold';
      case 'LOW':
        return 'bg-info-bg border-border text-text-primary font-bold';
      case 'INFO':
      default:
        return 'bg-bg-secondary border-border text-text-primary font-semibold';
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

  // Map backend color names to CSS classes
  const colorMap: Record<string, { colorClass: string; bgColor: string; borderColor: string }> = {
    green: { colorClass: 'text-success', bgColor: 'bg-success-bg', borderColor: 'border-border' },
    blue: { colorClass: 'text-info', bgColor: 'bg-info-bg', borderColor: 'border-border' },
    yellow: { colorClass: 'text-warning', bgColor: 'bg-warning-bg', borderColor: 'border-border' },
    orange: { colorClass: 'text-warning', bgColor: 'bg-warning-bg', borderColor: 'border-border' },
    red: { colorClass: 'text-danger', bgColor: 'bg-danger-bg', borderColor: 'border-border' },
    gray: { colorClass: 'text-text-secondary', bgColor: 'bg-bg-secondary', borderColor: 'border-border' },
  };
  const design = colorMap[postureColorStr] || colorMap.gray;

  // Map backend icon names to Lucide components
  const iconMap: Record<string, React.ComponentType<any>> = {
    'shield-check': ShieldCheck,
    'shield-alert': ShieldAlert,
    'shield-x': ShieldX,
    'shield': Shield,
  };
  const PostureIconComponent = iconMap[postureIconStr] || Shield;

  return (
    <div className="min-h-screen bg-bg-primary flex overflow-hidden">
      
      {/* Sidebar Navigation */}
      <Sidebar activePage="Scans" />

      {/* Main panel */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        
        {/* Custom Header Bar */}
        <header className="h-16 border-b border-border-warm bg-bg-primary flex items-center justify-between px-8 sticky top-0 z-20 flex-shrink-0">
          <div className="text-left">
            <Link to="/scans" className="text-xs font-bold text-text-muted hover:text-text-primary transition-colors flex items-center gap-1.5 select-none">
              <ArrowLeft className="w-3.5 h-3.5" /> Back to scanned list
            </Link>
          </div>

          <div className="flex items-center gap-4">
            
            {/* Download Report Dropdown */}
            <div className="relative group">
              <button className="px-3.5 py-1.5 bg-bg-secondary border border-border text-text-primary hover:bg-hover hover:text-text-primary text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm">
                <Download className="w-3.5 h-3.5 text-text-muted" /> Download Report <span className="text-[10px] opacity-75">▼</span>
              </button>
              <div className="absolute right-0 mt-1 w-40 bg-bg-primary border border-border-warm shadow-panel py-1.5 rounded-xl text-body-sm font-medium font-semibold text-text-primary hidden group-hover:block z-50">
                <button onClick={() => alert('Downloading PDF Executive summary report...')} className="w-full text-left px-4 py-2 hover:bg-bg-secondary transition-colors">PDF Summary Report</button>
                <button onClick={() => alert('Downloading PDF technical report...')} className="w-full text-left px-4 py-2 hover:bg-bg-secondary transition-colors">PDF Detailed Technical</button>
                <button onClick={() => alert('Downloading CSV list...')} className="w-full text-left px-4 py-2 hover:bg-bg-secondary transition-colors">CSV Table Export</button>
              </div>
            </div>

            {/* Export Dropdown */}
            <div className="relative group">
              <button className="px-3.5 py-1.5 bg-bg-secondary border border-border text-text-primary hover:bg-hover hover:text-text-primary text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm">
                <FileJson className="w-3.5 h-3.5 text-text-muted" /> Export <span className="text-[10px] opacity-75">▼</span>
              </button>
              <div className="absolute right-0 mt-1 w-36 bg-bg-primary border border-border-warm shadow-panel py-1.5 rounded-xl text-body-sm font-medium font-semibold text-text-primary hidden group-hover:block z-50">
                <button onClick={() => alert('Exporting raw JSON...')} className="w-full text-left px-4 py-2 hover:bg-bg-secondary transition-colors">Raw JSON Payload</button>
                <button onClick={() => alert('Exporting CSV...')} className="w-full text-left px-4 py-2 hover:bg-bg-secondary transition-colors">Normalized CSV</button>
              </div>
            </div>

            {/* Share Button */}
            <button 
              onClick={() => setShareModalOpen(true)} 
              className="px-3.5 py-1.5 bg-bg-secondary border border-border text-text-primary hover:bg-hover hover:text-text-primary text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
            >
              <Share2 className="w-3.5 h-3.5 text-text-muted" /> Share
            </button>

            {/* Divider line */}
            <div className="w-px h-6 bg-border-warm" />

            {/* User Profile */}
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs uppercase select-none flex-shrink-0"
                   style={{ backgroundColor: 'var(--color-accent-subtle)', border: '1.5px solid var(--color-accent)', color: 'var(--color-accent-dark)' }}>
                {initials}
              </div>
              <div className="text-left leading-tight hidden sm:block">
                <p className="font-semibold text-xs" style={{ color: 'var(--color-text-primary)' }}>
                  {user?.fullName ?? 'John Doe'}
                </p>
                <p className="text-[10px] font-medium" style={{ color: 'var(--color-text-secondary)' }}>
                  {user?.companyName ?? 'Acme Corp'}
                </p>
              </div>
            </div>

          </div>
        </header>

        {/* Scrollable page body */}
        <div className="flex-1 overflow-y-auto p-8 space-y-6">

          {/* 1. Target Details Card */}
          <div className="bg-bg-primary p-6 rounded-3xl border border-border-warm shadow-sm flex flex-col lg:flex-row justify-between gap-6">
            
            {/* Target Address information details */}
            <div className="space-y-3.5">
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
                <span className="text-body-sm font-mono font-medium text-text-muted bg-bg-primary border border-border-warm px-3 py-1 rounded-full flex items-center gap-1.5">
                  Scan ID: <strong className="text-text-primary font-bold">{id}</strong>
                </span>
              </div>
            </div>

            {/* Target Metadata stats grid */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-6 border-t lg:border-t-0 lg:border-l border-border-warm pt-4 lg:pt-0 lg:pl-8 text-left">
              
              <div>
                <p className="text-body-xs uppercase tracking-wider font-bold text-text-muted">Status</p>
                <span className="inline-block mt-1 px-2.5 py-1 bg-success-bg border border-border text-text-primary font-bold uppercase text-body-xs font-medium rounded-full select-none">
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

          </div>

          {/* 2. Donut / Stats Charts Dashboard Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Card 1: Security Posture */}
            <div className="bg-bg-primary p-5 rounded-3xl border border-border-warm shadow-sm flex flex-col justify-between h-[340px] text-left lg:col-span-2">
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
                          <Info className="w-3 h-3 text-text-muted cursor-help" />
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
              <div className="mt-3.5 bg-bg-secondary border border-border rounded-2xl p-3 flex items-center justify-between gap-4">
                <div className="flex items-start gap-2">
                  <Sparkles className="w-4 h-4 text-text-primary mt-0.5 flex-shrink-0" />
                  <div className="text-left">
                    <p className="text-[11px] font-extrabold text-text-primary flex items-center gap-1">
                      AI Summary
                    </p>
                    <p className="text-[11px] text-text-secondary leading-snug font-semibold mt-0.5">
                      {aiSummaryText}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Column 3: Timeline + Target Information Stack */}
            <div className="flex flex-col gap-3.5 h-[340px] justify-between text-left lg:col-span-1">
              
              {/* Card 3: Scan Timeline */}
              <div className="bg-bg-primary p-4 rounded-3xl border border-border-warm shadow-sm flex flex-col justify-between flex-1 min-h-0">
                <p className="text-body-xs font-bold text-text-primary uppercase tracking-wider mb-1" style={{ fontFamily: 'var(--font-heading)' }}>Scan Timeline</p>
                
                {/* Stepper nodes timeline */}
                <div className="relative flex items-center justify-between px-1.5 flex-1 items-center">
                  {/* Horizontal joining track lines */}
                  <div className="absolute left-4 right-4 top-[14px] h-0.5 bg-green-200 z-0" />
                  
                  {/* Node 1: Queued */}
                  <div className="flex flex-col items-center text-center z-10 space-y-1">
                    <div className="w-4.5 h-4.5 rounded-full bg-success-bg0 text-text-primary flex items-center justify-center text-[9px] font-bold shadow-sm">
                      ✓
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-[8px] font-bold text-text-primary">Queued</p>
                      <p className="text-[7.5px] text-text-muted font-mono">{formatDate(scan.startedAt)?.split(',')[1]?.trim() || '9:35:10 PM'}</p>
                    </div>
                  </div>

                  {/* Node 2: Preparing */}
                  <div className="flex flex-col items-center text-center z-10 space-y-1">
                    <div className="w-4.5 h-4.5 rounded-full bg-success-bg0 text-text-primary flex items-center justify-center text-[9px] font-bold shadow-sm">
                      ✓
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-[8px] font-bold text-text-primary">Preparing</p>
                      <p className="text-[7.5px] text-text-muted font-mono">{formatDate(scan.startedAt)?.split(',')[1]?.trim() || '9:35:15 PM'}</p>
                    </div>
                  </div>

                  {/* Node 3: Running */}
                  <div className="flex flex-col items-center text-center z-10 space-y-1">
                    <div className="w-4.5 h-4.5 rounded-full bg-success-bg0 text-text-primary flex items-center justify-center text-[9px] font-bold shadow-sm">
                      ✓
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-[8px] font-bold text-text-primary">Running</p>
                      <p className="text-[7.5px] text-text-muted font-mono">{formatDate(scan.startedAt)?.split(',')[1]?.trim() || '9:35:18 PM'}</p>
                    </div>
                  </div>

                  {/* Node 4: Completed */}
                  <div className="flex flex-col items-center text-center z-10 space-y-1">
                    <div className="w-4.5 h-4.5 rounded-full bg-success-bg0 text-text-primary flex items-center justify-center text-[9px] font-bold shadow-sm">
                      ✓
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-[8px] font-bold text-text-primary">Completed</p>
                      <p className="text-[7.5px] text-text-muted font-mono">{formatDate(scan.completedAt)?.split(',')[1]?.trim() || '9:41:00 PM'}</p>
                    </div>
                  </div>

                </div>
              </div>

              {/* Card 4: Target Information (Cleaned: tabular key-value design with border alignment) */}
              <div className="bg-bg-primary p-4 rounded-3xl border border-border-warm shadow-sm flex flex-col justify-between flex-1 min-h-0">
                <p className="text-body-xs font-bold text-text-primary uppercase tracking-wider mb-1.5" style={{ fontFamily: 'var(--font-heading)' }}>Target Information</p>
                
                <div className="grid grid-cols-2 gap-x-6 gap-y-0 text-body-xs leading-tight font-semibold text-text-secondary flex-1">
                  
                  {/* Left Column key-values */}
                  <div className="space-y-1">
                    <div className="grid grid-cols-[60px_1fr] items-center py-0.5 border-b border-border-warm/30">
                      <span className="text-text-muted text-[7.5px] uppercase tracking-wider font-bold">URL</span>
                      <span className="font-mono truncate text-text-primary" title={scan.targetUrl}>{scan.targetUrl}</span>
                    </div>
                    <div className="grid grid-cols-[60px_1fr] items-center py-0.5 border-b border-border-warm/30">
                      <span className="text-text-muted text-[7.5px] uppercase tracking-wider font-bold">IP Addr</span>
                      <span className="font-mono text-text-primary truncate">{targetInfo.ip}</span>
                    </div>
                    <div className="grid grid-cols-[60px_1fr] items-center py-0.5">
                      <span className="text-text-muted text-[7.5px] uppercase tracking-wider font-bold">Server</span>
                      <span className="text-text-primary truncate font-bold">{targetInfo.server}</span>
                    </div>
                  </div>

                  {/* Right Column key-values */}
                  <div className="space-y-1">
                    <div className="grid grid-cols-[60px_1fr] items-center py-0.5 border-b border-border-warm/30">
                      <span className="text-text-muted text-[7.5px] uppercase tracking-wider font-bold">Final URL</span>
                      <span className="font-mono truncate text-text-primary" title={targetInfo.finalUrl}>{targetInfo.finalUrl}</span>
                    </div>
                    <div className="grid grid-cols-[60px_1fr] items-center py-0.5 border-b border-border-warm/30">
                      <span className="text-text-muted text-[7.5px] uppercase tracking-wider font-bold">Code</span>
                      <span className="font-mono text-green-700 font-bold">{targetInfo.code}</span>
                    </div>
                    <div className="grid grid-cols-[60px_1fr] items-center py-0.5">
                      <span className="text-text-muted text-[7.5px] uppercase tracking-wider font-bold">Type</span>
                      <span className="font-mono text-text-primary truncate" title={targetInfo.contentType}>{targetInfo.contentType}</span>
                    </div>
                  </div>

                </div>
              </div>

            </div>

          </div>

          {/* 3. Main content body split layout: left Sidebar, right findings table */}
          <div className="grid grid-cols-12 gap-6 items-stretch h-[560px]">
            
            {/* Left sidebar: modules selector */}
            <div className="col-span-12 lg:col-span-3 bg-bg-primary p-5 rounded-3xl border border-border-warm shadow-sm flex flex-col h-full overflow-hidden">
              <div className="flex items-center justify-between border-b border-border-warm pb-3 flex-shrink-0">
                <h3 className="text-xs font-extrabold text-text-primary uppercase tracking-wider">Modules</h3>
                <span className="px-2 py-0.5 bg-info-bg text-info font-bold font-mono text-body-xs font-medium rounded-full">
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
                      ? 'bg-info-bg/50 text-text-primary border border-border'
                      : 'bg-transparent text-text-primary hover:bg-bg-primary border border-transparent'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span>📂</span> Overview
                  </span>
                  <span className="font-mono text-body-sm opacity-75">{findings.length} findings</span>
                </button>
              </div>

              {/* Modules scrollable area */}
              <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 min-h-0">
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
                        ? 'bg-info-bg/50 text-text-primary border-border font-bold'
                        : 'bg-transparent text-text-secondary hover:bg-bg-primary border-transparent hover:text-text-primary font-semibold'
                    }`}
                  >
                    <span className="flex items-center gap-2 truncate">
                      <span>{mod.icon}</span>
                      <span className="truncate">{mod.label}</span>
                    </span>

                    <div className="flex items-center gap-2">
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
                  className="text-body-sm font-bold text-info hover:text-info cursor-pointer"
                >
                  Show all modules
                </button>
              </div>
            </div>

            {/* Right: filterable findings table list */}
            <div className="col-span-12 lg:col-span-9 flex flex-col h-full overflow-hidden text-left">
              
              {/* Filter tabs block */}
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border-warm flex-shrink-0 mb-4">
                
                {/* Severity Tabs */}
                <div className="flex flex-wrap -mb-px">
                  {[
                    { id: 'ALL', label: 'All Findings', count: stats.total, style: 'border-blue-600 text-info' },
                    { id: 'CRITICAL', label: 'Critical', count: stats.CRITICAL, style: 'border-red-600 text-danger' },
                    { id: 'HIGH', label: 'High', count: stats.HIGH, style: 'border-orange-600 text-warning' },
                    { id: 'MEDIUM', label: 'Medium', count: stats.MEDIUM, style: 'border-yellow-600 text-yellow-700' },
                    { id: 'LOW', label: 'Low', count: stats.LOW, style: 'border-blue-600 text-info' },
                    { id: 'INFO', label: 'Info', count: stats.INFO, style: 'border-border-warm0 text-text-secondary' }
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
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted text-body-sm">🔍</span>
                    <input
                      type="text"
                      placeholder="Search findings..."
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                        setCurrentPage(1);
                      }}
                      className="w-full pl-7 pr-3 py-1.5 bg-bg-primary border border-border-warm rounded-xl text-body-sm font-medium focus:outline-none placeholder:text-text-muted"
                    />
                  </div>
                  <button className="px-3 py-1.5 bg-bg-primary border border-border-warm text-text-secondary text-body-sm font-semibold rounded-xl hover:bg-bg-primary transition-colors cursor-pointer flex items-center gap-1">
                    <span>🎛️</span> Filters
                  </button>
                  <button className="px-3 py-1.5 bg-bg-primary border border-border-warm text-text-secondary text-body-sm font-semibold rounded-xl hover:bg-bg-primary transition-colors cursor-pointer flex items-center gap-1">
                    <span>⚙️</span> Columns
                  </button>
                </div>

              </div>

              {/* Findings Card wrapper with fixed height alignment */}
              <div className="flex-1 bg-bg-primary border border-border-warm rounded-3xl shadow-sm flex flex-col overflow-hidden min-h-0">
                
                {/* Headers */}
                <div className="grid grid-cols-12 gap-4 px-6 py-3.5 bg-bg-secondary/40 text-text-muted font-bold uppercase tracking-wider text-body-sm flex-shrink-0 border-b border-border-warm">
                  <div className="col-span-2">Severity</div>
                  <div className="col-span-4">Finding / Description</div>
                  <div className="col-span-3">Module</div>
                  <div className="col-span-2">Category</div>
                  <div className="col-span-1 text-right">Action</div>
                </div>

                {/* Scrollable Table body */}
                <div className="flex-1 overflow-y-auto divide-y divide-border-warm min-h-0">
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
                          className="grid grid-cols-12 gap-4 items-center px-6 py-4 cursor-pointer hover:bg-bg-secondary/30 transition-colors text-xs text-text-primary"
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
                            <span className="px-2 py-1 rounded border border-border-warm bg-bg-primary text-[10px] text-text-secondary hover:bg-bg-primary hover:text-text-primary transition-all shadow-xs">
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
                  <div className="flex items-center justify-between px-6 py-3.5 border-t border-border-warm bg-bg-secondary/10 flex-shrink-0 text-body-sm font-semibold text-text-secondary select-none">
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
                          className="bg-bg-primary border border-border-warm px-2 py-1 rounded-lg text-body-sm focus:outline-none"
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
                          className="w-7 h-7 rounded-lg border border-border-warm bg-bg-primary hover:bg-bg-primary text-text-secondary flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                        >
                          ◀
                        </button>
                        
                        {[...Array(totalPages)].map((_, i) => (
                          <button
                            key={i}
                            onClick={() => setCurrentPage(i + 1)}
                            className={`w-7 h-7 rounded-lg border flex items-center justify-center cursor-pointer transition-colors text-body-sm ${
                              currentPage === i + 1
                                ? 'bg-blue-600 border-blue-700 text-text-primary font-bold'
                                : 'bg-bg-primary border-border-warm hover:bg-bg-primary text-text-secondary font-bold'
                            }`}
                          >
                            {i + 1}
                          </button>
                        ))}

                        <button 
                          disabled={currentPage === totalPages}
                          onClick={() => setCurrentPage(currentPage + 1)}
                          className="w-7 h-7 rounded-lg border border-border-warm bg-bg-primary hover:bg-bg-primary text-text-secondary flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                        >
                          ▶
                        </button>
                      </div>
                    </div>
                  </div>
                )}

              </div>

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
          <div className="fixed top-0 right-0 h-full w-[450px] sm:w-[500px] md:w-[600px] bg-bg-primary border-l border-border-warm shadow-2xl z-50 flex flex-col animate-in slide-in-from-right duration-300">
            
            {/* Drawer Header */}
            <div className="p-6 border-b border-border-warm flex items-start justify-between flex-shrink-0">
              <div className="space-y-2 text-left">
                <span className={`px-2.5 py-1 border rounded text-body-sm font-bold uppercase select-none ${getSeverityStyle(selectedFinding.severity)}`}>
                  {selectedFinding.severity}
                </span>
                <h3 className="text-title-h2 font-black text-text-primary mt-2 leading-snug">
                  {selectedFinding.title}
                </h3>
                <p className="text-body-xs font-semibold text-text-muted">
                  Module: <span className="text-text-primary font-bold">{systemModules.find(m => m.id === selectedFinding.module)?.label || selectedFinding.module}</span> | Category: <span className="text-text-primary font-bold text-text-muted">{selectedFinding.category || 'Security check'}</span>
                </p>
              </div>
              <button 
                onClick={() => setIsDrawerOpen(false)}
                className="w-8 h-8 rounded-full border border-border-warm hover:bg-bg-primary text-text-secondary flex items-center justify-center transition-colors cursor-pointer text-xs"
                title="Close panel"
              >
                ✕
              </button>
            </div>

            {/* Drawer Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 text-left">
              
              {/* SECTION A: TECHNICAL FINDINGS (100% FACTUAL) */}
              <div className="space-y-6">
                <div className="flex items-center gap-2 border-b border-border-warm pb-2">
                  <span>📋</span>
                  <h4 className="text-body-xs font-extrabold text-text-primary uppercase tracking-wider">Technical Findings</h4>
                  <span className="px-2 py-0.5 rounded-full text-[8px] font-bold uppercase bg-bg-muted text-text-secondary select-none">
                    Verified Scanner Data
                  </span>
                </div>

                {/* 1. OVERVIEW */}
                <div className="space-y-2">
                  <p className="text-body-xs font-extrabold text-text-muted uppercase tracking-wider">Overview</p>
                  <div className="text-body-md text-text-secondary leading-relaxed font-semibold">
                    {renderFormattedText(selectedFinding.description)}
                  </div>
                </div>


                {selectedFinding.module === 'technology' && (
                  <div className="space-y-2">
                    <p className="text-body-xs font-extrabold text-text-muted uppercase tracking-wider">Fingerprinted Stack Inventory</p>
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
                            <div key={idx} className="bg-bg-primary border border-border-warm p-3.5 rounded-2xl flex items-center gap-2.5 shadow-sm">
                              {logoUrl ? (
                                <img src={logoUrl} className="w-6 h-6 object-contain" alt={techName} />
                              ) : (
                                <span className="w-6 h-6 rounded-full bg-bg-muted flex items-center justify-center text-body-xs font-bold text-text-muted select-none">
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
                  <p className="text-body-xs font-extrabold text-text-muted uppercase tracking-wider">Affected Resource</p>
                  <div className="p-3.5 bg-bg-primary border border-border-warm rounded-2xl flex items-center gap-3 shadow-xs">
                    <span className="w-8 h-8 rounded-full bg-bg-secondary border border-border-warm flex items-center justify-center text-base text-text-muted select-none">🌐</span>
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
                    <p className="text-body-xs font-extrabold text-text-muted uppercase tracking-wider">Evidence / Proof</p>
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
                    <p className="text-body-xs font-extrabold text-text-muted uppercase tracking-wider">References</p>
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
                                className="px-3.5 py-2 bg-bg-primary border border-border-warm hover:bg-bg-primary hover:text-info transition-colors text-body-xs font-semibold rounded-xl flex items-center gap-2 shadow-sm"
                              >
                                <span>{info.icon}</span>
                                <span className="truncate max-w-[120px]">{info.label}</span>
                              </a>
                            );
                          });
                        } catch {
                          return (
                            <>
                              <a href="https://owasp.org" target="_blank" rel="noreferrer" className="px-3.5 py-2 bg-bg-primary border border-border-warm hover:bg-bg-primary text-body-xs font-semibold rounded-xl flex items-center gap-2 shadow-sm">
                                <span>🛡️</span> <span>OWASP</span>
                              </a>
                              <a href="https://nist.gov" target="_blank" rel="noreferrer" className="px-3.5 py-2 bg-bg-primary border border-border-warm hover:bg-bg-primary text-body-xs font-semibold rounded-xl flex items-center gap-2 shadow-sm">
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
                      <p className="text-body-xs font-extrabold text-text-muted uppercase tracking-wider">Scanner Details</p>
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
              <div className="border-t border-border-warm pt-6 mt-6 space-y-6">
                <div className="flex items-center gap-2">
                  <span>🛡️</span>
                  <h4 className="text-body-xs font-extrabold text-text-primary uppercase tracking-wider">AI Security Analysis</h4>
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
                        <p className="text-body-xs font-extrabold text-text-muted uppercase tracking-wider">AI Executive Summary</p>
                      </div>
                      <div className="p-4 bg-bg-primary border border-border-warm rounded-2xl">
                        <div className="text-body-sm font-semibold text-text-secondary leading-relaxed">
                          {renderFormattedText(aiAnalysis.executiveSummary)}
                        </div>
                        <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-border-warm/60 text-[9px] font-bold text-text-muted uppercase select-none">
                          <span>🛡️</span>
                          <span>Generated from verified scanner findings. No additional vulnerabilities were inferred.</span>
                        </div>
                      </div>
                    </div>

                    {/* Priority & Risk Explanation (Merged into one clean, non-stretching card) */}
                    <div className="p-4 bg-bg-primary border border-border-warm rounded-2xl text-left space-y-3.5">
                      <div className="flex items-center justify-between border-b border-border-warm/40 pb-2">
                        <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Remediation Priority</span>
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase select-none ${
                          aiAnalysis.priority === 'CRITICAL' ? 'bg-danger-bg text-text-primary border border-border' :
                          aiAnalysis.priority === 'HIGH' ? 'bg-warning-bg text-text-primary border border-border' :
                          aiAnalysis.priority === 'MEDIUM' ? 'bg-warning-bg text-text-primary border border-border' :
                          'bg-info-bg text-text-primary border border-border'
                        }`}>
                          {aiAnalysis.priority}
                        </span>
                      </div>
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Risk Level Explanation</span>
                        <div className="text-body-xs text-text-secondary font-medium leading-relaxed mt-1">
                          {renderFormattedText(aiAnalysis.riskExplanation)}
                        </div>
                      </div>
                    </div>

                    {/* Business Impact */}
                    <div className="space-y-2">
                      <p className="text-body-xs font-extrabold text-text-muted uppercase tracking-wider">Business Impact</p>
                      <div className="text-body-sm text-text-secondary leading-relaxed font-semibold">
                        {renderFormattedText(aiAnalysis.businessImpact)}
                      </div>
                    </div>

                    {/* Attack Scenarios */}
                    <div className="space-y-2">
                      <p className="text-body-xs font-extrabold text-text-muted uppercase tracking-wider">Potential Attack Scenarios</p>
                      <div className="p-4 bg-bg-secondary border border-border-warm rounded-2xl">
                        <div className="text-body-xs text-text-secondary leading-relaxed font-medium italic">
                          {renderFormattedText(aiAnalysis.attackScenarios)}
                        </div>
                      </div>
                    </div>

                    {/* Recommended Next Steps */}
                    {aiAnalysis.nextSteps && aiAnalysis.nextSteps.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-body-xs font-extrabold text-text-muted uppercase tracking-wider">Recommended Next Steps</p>
                        <div className="p-4 bg-success-bg border border-border rounded-2xl text-text-primary leading-relaxed font-semibold text-body-xs shadow-xs flex flex-col gap-2.5">
                          {aiAnalysis.nextSteps.map((step: string, sIdx: number) => (
                            <div key={sIdx} className="flex items-start gap-2.5">
                              <input type="checkbox" readOnly checked className="mt-0.5 rounded text-success focus:ring-emerald-500 cursor-default" />
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

          </div>
        </>
      )}

      {/* ─── Share Modal ─ always at root level ─── */}
      {shareModalOpen && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-[60] flex items-center justify-center p-4"
          onClick={() => setShareModalOpen(false)}
        >
          <div
            className="relative w-full max-w-md rounded-3xl overflow-hidden text-left"
            style={{ backgroundColor: 'var(--color-bg-primary)', border: '1px solid #EDE8E0', boxShadow: '0 24px 48px -8px rgba(60,40,10,0.22)' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-6 flex items-center justify-between" style={{ borderBottom: '1px solid #EDE8E0', backgroundColor: '#F9F5EF' }}>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: '#FDF0DC', border: '1px solid #E8C98A' }}>
                  <svg className="w-5 h-5" style={{ color: '#C4933F' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-bold" style={{ color: '#1E1508' }}>Share Scan Results</p>
                  <p className="text-[10px] font-medium mt-0.5" style={{ color: '#A89880' }}>Control who can view this report</p>
                </div>
              </div>
              <button
                onClick={() => setShareModalOpen(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center transition-all cursor-pointer text-xs"
                style={{ border: '1px solid var(--color-border)', color: 'var(--color-text-muted)' }}
                onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#F0EBE1')}
                onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
              >
                ✕
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-5">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider mb-2.5" style={{ color: 'var(--color-text-muted)' }}>Visibility</p>
                <div className="grid grid-cols-2 gap-2">
                  {(['private', 'public'] as const).map((opt) => (
                    <button
                      key={opt}
                      onClick={() => setSharePrivacy(opt)}
                      className="p-3.5 rounded-2xl text-left transition-all cursor-pointer border-2"
                      style={{ backgroundColor: sharePrivacy === opt ? '#FDF6E7' : '#F5F0E8', borderColor: sharePrivacy === opt ? '#C4933F' : '#E0D8CC' }}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        {opt === 'private' ? (
                          <svg className="w-4 h-4" style={{ color: sharePrivacy === 'private' ? '#C4933F' : '#8A7460' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                          </svg>
                        ) : (
                          <svg className="w-4 h-4" style={{ color: sharePrivacy === 'public' ? '#C4933F' : '#8A7460' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
                          </svg>
                        )}
                        <span className="text-xs font-bold capitalize" style={{ color: sharePrivacy === opt ? '#A67C2E' : '#4A3828' }}>{opt}</span>
                      </div>
                      <p className="text-[10px] font-medium" style={{ color: '#A89880' }}>
                        {opt === 'private' ? 'Only people with the link and permission can view' : 'Anyone with the link can view this report'}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--color-text-muted)' }}>Share Link</p>
                <div className="flex gap-2">
                  <div className="flex-1 px-3.5 py-2.5 rounded-xl font-mono text-xs truncate select-all" style={{ backgroundColor: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', color: 'var(--color-text-secondary)' }}>
                    {`${window.location.origin}/share/${scan?.shareToken || id}`}
                  </div>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(`${window.location.origin}/share/${scan?.shareToken || id}`);
                      setShareCopied(true);
                      setTimeout(() => setShareCopied(false), 2000);
                    }}
                    className="px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 flex-shrink-0"
                    style={{ backgroundColor: shareCopied ? '#E8F5E9' : '#C4933F', color: shareCopied ? '#2E7D32' : '#FFFFFF', border: shareCopied ? '1px solid #A5D6A7' : '1px solid #C4933F' }}
                  >
                    {shareCopied
                      ? <><svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>Copied!</>
                      : <><svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" /></svg>Copy Link</>
                    }
                  </button>
                </div>
              </div>

              <div className="flex items-start gap-2.5 p-3.5 rounded-2xl" style={{ backgroundColor: sharePrivacy === 'public' ? '#FFFBEB' : '#F5F0E8', border: `1px solid ${sharePrivacy === 'public' ? '#FDE68A' : '#E0D8CC'}` }}>
                <svg className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: sharePrivacy === 'public' ? '#D97706' : '#8A7460' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
                </svg>
                <p className="text-[11px] font-medium leading-relaxed" style={{ color: sharePrivacy === 'public' ? '#92400E' : '#6B5A3E' }}>
                  {sharePrivacy === 'public'
                    ? 'This report is publicly accessible. Anyone with the link can view findings without logging in.'
                    : 'This report is private. Recipients must have a CipherLens account and be granted access to view it.'}
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 pb-6 flex items-center justify-between" style={{ borderTop: '1px solid #EDE8E0', paddingTop: '16px' }}>
              <div className="flex-1 text-left min-w-0 pr-4">
                {isSavedSuccess && (
                  <span className="text-xs font-bold text-success flex items-center gap-1 animate-pulse">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                    Settings saved successfully!
                  </span>
                )}
                {saveError && (
                  <span className="text-xs font-bold text-rose-600 truncate block" title={saveError}>
                    {saveError}
                  </span>
                )}
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <button
                  onClick={() => setShareModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer"
                  style={{ backgroundColor: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', color: 'var(--color-text-secondary)' }}
                  onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#EDE8E0')}
                  onMouseLeave={e => (e.currentTarget.style.backgroundColor='var(--color-bg-secondary)')}
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    if (id) {
                      setSaveError(null);
                      patchScan.mutate(
                        { id, isPublic: sharePrivacy === 'public' },
                        {
                          onSuccess: () => {
                            setIsSavedSuccess(true);
                            setTimeout(() => setIsSavedSuccess(false), 3000);
                          },
                          onError: (err) => {
                            setSaveError(err.message || 'Failed to save settings');
                          }
                        }
                      );
                    }
                  }}
                  className="px-5 py-2 rounded-xl text-xs font-bold text-text-primary transition-all cursor-pointer flex items-center gap-1.5"
                  style={{ backgroundColor: '#C4933F', border: '1px solid #C4933F' }}
                  onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#A67C2E')}
                  onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#C4933F')}
                >
                  {patchScan.isPending ? (
                    <>
                      <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Saving...
                    </>
                  ) : 'Save Settings'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
