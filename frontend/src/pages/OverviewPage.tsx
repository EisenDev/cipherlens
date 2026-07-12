import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../components/DashboardLayout';
import PageHeading from '../components/PageHeading';
import Card from '../components/Card';

import { PagesFontSize } from '../components/PagesFontSize';
import { apiRequest } from '../api/client';
import { useScanSummary, useScans, type ScanRecord } from '../hooks/useScans';
import {
  Activity,
  Shield,
  AlertTriangle,
  Database,
  TrendingUp,
  TrendingDown,
  Clock,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Globe,
  GitBranch,
  ChevronRight,
  Zap,
} from 'lucide-react';

/* ─────────────────────────────────────────────
   Types
───────────────────────────────────────────── */
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
}

interface FindingsStats {
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

/* ─────────────────────────────────────────────
   Helpers
───────────────────────────────────────────── */
function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}


/* ─────────────────────────────────────────────
   Sub-components
───────────────────────────────────────────── */

/** Animated donut ring chart (SVG, no library) */
function DonutChart({
  segments,
  size = 120,
  strokeWidth = 14,
}: {
  segments: { value: number; color: string; label: string }[];
  size?: number;
  strokeWidth?: number;
}) {
  const r = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * r;
  const cx = size / 2;
  const cy = size / 2;

  const total = segments.reduce((s, seg) => s + seg.value, 0);
  let offset = 0;

  const arcs = segments
    .filter((seg) => seg.value > 0)
    .map((seg) => {
      const dash = total === 0 ? 0 : (seg.value / total) * circumference;
      const gap = circumference - dash;
      const startOffset = circumference - offset;
      offset += dash;
      return { ...seg, dash, gap, startOffset };
    });

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="rotate-[-90deg]">
      {/* background track */}
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill="none"
        stroke="var(--color-border)"
        strokeWidth={strokeWidth}
      />
      {arcs.map((arc, i) => (
        <circle
          key={i}
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke={arc.color}
          strokeWidth={strokeWidth}
          strokeDasharray={`${arc.dash} ${arc.gap}`}
          strokeDashoffset={arc.startOffset}
          strokeLinecap="butt"
          style={{ transition: 'stroke-dasharray 0.6s ease, stroke-dashoffset 0.6s ease' }}
        />
      ))}
    </svg>
  );
}

/** Compact horizontal bar chart for severity breakdown */
function SeverityBar({
  label,
  value,
  total,
  color,
}: {
  label: string;
  value: number;
  total: number;
  color: string;
}) {
  const pct = total > 0 ? Math.max((value / total) * 100, value > 0 ? 2 : 0) : 0;
  return (
    <div className="flex items-center gap-3">
      <span
        className="text-[10px] font-bold uppercase tracking-wider w-16 flex-shrink-0"
        style={{ color: 'var(--color-text-muted)' }}
      >
        {label}
      </span>
      <div
        className="flex-1 h-1.5 rounded-full overflow-hidden"
        style={{ background: 'var(--color-border)' }}
      >
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
      <span
        className="text-xs font-bold w-6 text-right flex-shrink-0"
        style={{ color: 'var(--color-text-primary)' }}
      >
        {value}
      </span>
    </div>
  );
}

/** Scan status badge */
function StatusBadge({ status }: { status: string }) {
  const cfg: Record<string, { label: string; bg: string; text: string }> = {
    COMPLETED: {
      label: 'Completed',
      bg: 'var(--color-success-bg)',
      text: 'var(--color-success)',
    },
    RUNNING: {
      label: 'Running',
      bg: 'var(--color-info-bg)',
      text: 'var(--color-info)',
    },
    QUEUED: {
      label: 'Queued',
      bg: 'var(--color-warning-bg)',
      text: 'var(--color-warning)',
    },
    FAILED: {
      label: 'Failed',
      bg: 'var(--color-danger-bg)',
      text: 'var(--color-danger)',
    },
    CANCELLED: {
      label: 'Cancelled',
      bg: 'var(--color-bg-muted)',
      text: 'var(--color-text-muted)',
    },
  };
  const c = cfg[status] || cfg['CANCELLED'];
  return (
    <span
      className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
      style={{ background: c.bg, color: c.text }}
    >
      {c.label}
    </span>
  );
}

/** Security posture badge */
function PostureBadge({ posture }: { posture: string | null }) {
  if (!posture)
    return (
      <span className="text-[10px] font-mono text-text-muted">–</span>
    );
  const p = posture.toUpperCase();
  const cfg: Record<string, { bg: string; text: string }> = {
    GOOD: { bg: 'var(--color-success-bg)', text: 'var(--color-success)' },
    MODERATE: { bg: 'var(--color-warning-bg)', text: 'var(--color-warning)' },
    POOR: { bg: 'var(--color-danger-bg)', text: 'var(--color-danger)' },
    CRITICAL: { bg: 'var(--color-danger-bg)', text: 'var(--color-danger)' },
  };
  const c = cfg[p] || { bg: 'var(--color-bg-muted)', text: 'var(--color-text-muted)' };
  return (
    <span
      className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
      style={{ background: c.bg, color: c.text }}
    >
      {posture}
    </span>
  );
}

/* ─────────────────────────────────────────────
   Sparkline (SVG mini line chart)
───────────────────────────────────────────── */
function Sparkline({
  values,
  color,
  width = 80,
  height = 28,
}: {
  values: number[];
  color: string;
  width?: number;
  height?: number;
}) {
  if (values.length < 2) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const points = values
    .map((v, i) => {
      const x = (i / (values.length - 1)) * width;
      const y = height - ((v - min) / range) * height;
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
    </svg>
  );
}

/* ─────────────────────────────────────────────
   Main Page
───────────────────────────────────────────── */
export default function OverviewPage() {
  const navigate = useNavigate();

  /* Scan summary (from hook) */
  const { data: scanSummary } = useScanSummary();

  /* Recent scans for activity feed */
  const { data: recentScansData } = useScans({
    page: 1,
    limit: 50,
  });

  /* Assets */
  const [assets, setAssets] = useState<AssetRecord[]>([]);

  /* Findings stats */
  const [findingsStats, setFindingsStats] = useState<FindingsStats | null>(null);

  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());
  const [refreshing, setRefreshing] = useState(false);

  /* ── Data Fetching ── */
  const fetchAssets = () =>
    apiRequest('/api/assets')
      .then((data: AssetRecord[]) => setAssets(data))
      .catch(() => setAssets([]));

  const fetchFindings = () =>
    apiRequest('/api/findings')
      .then((res: { stats: FindingsStats }) => setFindingsStats(res.stats))
      .catch(() => setFindingsStats(null));

  useEffect(() => {
    fetchAssets();
    fetchFindings();
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchAssets(), fetchFindings()]);
    setLastRefreshed(new Date());
    setTimeout(() => setRefreshing(false), 400);
  };


  /* ── Derived Data ── */
  const recentScans = useMemo(
    () => (recentScansData?.data ?? []).slice(0, 8),
    [recentScansData]
  );

  /** Asset type breakdown */
  const assetTypeBreakdown = useMemo(() => {
    const websites = assets.filter((a) => a.type === 'WEBSITE').length;
    const repos = assets.filter((a) => a.type === 'REPOSITORY').length;
    return { websites, repos, total: assets.length };
  }, [assets]);

  /** Scan status distribution for donut */
  const scanDonutSegments = useMemo(() => {
    if (!scanSummary) return [];
    return [
      { value: scanSummary.completed, color: 'var(--color-success)', label: 'Completed' },
      { value: scanSummary.running, color: 'var(--color-info)', label: 'Running' },
      { value: scanSummary.queued, color: 'var(--color-warning)', label: 'Queued' },
      { value: scanSummary.failed, color: 'var(--color-danger)', label: 'Failed' },
    ];
  }, [scanSummary]);

  /** Findings severity segments for donut */
  const findingsDonutSegments = useMemo(() => {
    if (!findingsStats) return [];
    return [
      { value: findingsStats.criticalActive, color: '#7B1D1D', label: 'Critical' },
      { value: findingsStats.highActive, color: 'var(--color-danger)', label: 'High' },
      { value: findingsStats.mediumActive, color: 'var(--color-warning)', label: 'Medium' },
      { value: findingsStats.lowActive, color: 'var(--color-success)', label: 'Low' },
      { value: findingsStats.infoActive, color: 'var(--color-info)', label: 'Info' },
    ];
  }, [findingsStats]);

  /** Security posture distribution */
  const postureBreakdown = useMemo(() => {
    const counts = { GOOD: 0, MODERATE: 0, POOR: 0, CRITICAL: 0, UNKNOWN: 0 };
    for (const a of assets) {
      const p = (a.security_posture ?? 'UNKNOWN').toUpperCase();
      if (p in counts) (counts as Record<string, number>)[p]++;
      else counts.UNKNOWN++;
    }
    return counts;
  }, [assets]);

  /** Scan timeline – group by day (last 14 days) */
  const scanTimeline = useMemo(() => {
    const scans = recentScansData?.data ?? [];
    const today = new Date();
    const days: { label: string; completed: number; failed: number }[] = [];

    for (let i = 13; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const dayStr = d.toISOString().slice(0, 10);
      const completed = scans.filter(
        (s) => s.createdAt.slice(0, 10) === dayStr && s.status === 'COMPLETED'
      ).length;
      const failed = scans.filter(
        (s) => s.createdAt.slice(0, 10) === dayStr && s.status === 'FAILED'
      ).length;
      days.push({ label, completed, failed });
    }
    return days;
  }, [recentScansData]);

  /** Assets with critical findings (top 5) */
  const topVulnerableAssets = useMemo(
    () =>
      [...assets]
        .filter((a) => a.critical_findings > 0)
        .sort((a, b) => b.critical_findings - a.critical_findings)
        .slice(0, 5),
    [assets]
  );

  /* ── Bar chart max for timeline ── */
  const timelineMax = useMemo(
    () => Math.max(...scanTimeline.map((d) => d.completed + d.failed), 1),
    [scanTimeline]
  );



  return (
    <DashboardLayout activePage="Overview">
      <div className="py-8 px-10 space-y-7 w-full">

        {/* ── Header ── */}
        <PageHeading
          title="Overview"
          description="A consolidated view of your security posture, scan activity, and findings across all assets."
          actions={
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="px-4 py-2 text-xs font-semibold rounded-xl flex items-center gap-2 transition-all cursor-pointer disabled:opacity-60"
              style={{
                backgroundColor: 'var(--color-bg-secondary)',
                border: '1px solid var(--color-border)',
                color: 'var(--color-text-secondary)',
                fontFamily: 'var(--font-body)',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-hover)')}
              onMouseLeave={(e) =>
                (e.currentTarget.style.backgroundColor = 'var(--color-bg-secondary)')
              }
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`}
              />
              Refresh
            </button>
          }
        />

        {/* Last refreshed */}
        <p className={PagesFontSize.bodyMuted}>
          Last updated: {lastRefreshed.toLocaleTimeString()}
        </p>

        {/* ═══════════════════════════════════════════
            Row 1 — KPI Summary Cards
        ════════════════════════════════════════════ */}
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">

          {/* Total Assets */}
          <Card className="flex flex-col gap-3">
            <div className="flex items-start justify-between">
              <div
                className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: 'var(--color-info-bg)', color: 'var(--color-info)' }}
              >
                <Database className="w-4 h-4" />
              </div>
              <Sparkline
                values={[assets.length - 3, assets.length - 2, assets.length - 1, assets.length]}
                color="var(--color-info)"
              />
            </div>
            <div>
              <p className={PagesFontSize.cardTitle}>Total Assets</p>
              <p className="text-2xl font-bold font-mono" style={{ color: 'var(--color-text-primary)' }}>
                {assets.length}
              </p>
              <p className="text-[10px] mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                {assetTypeBreakdown.websites} sites · {assetTypeBreakdown.repos} repos
              </p>
            </div>
          </Card>

          {/* Total Scans */}
          <Card className="flex flex-col gap-3">
            <div className="flex items-start justify-between">
              <div
                className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: 'var(--color-accent-subtle)', color: 'var(--color-accent)' }}
              >
                <Activity className="w-4 h-4" />
              </div>
              <Sparkline
                values={scanTimeline.map((d) => d.completed).slice(-6)}
                color="var(--color-accent)"
              />
            </div>
            <div>
              <p className={PagesFontSize.cardTitle}>Total Scans</p>
              <p className="text-2xl font-bold font-mono" style={{ color: 'var(--color-text-primary)' }}>
                {scanSummary?.total ?? 0}
              </p>
              <p className="text-[10px] mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                {scanSummary?.running ?? 0} running now
              </p>
            </div>
          </Card>

          {/* Completed Scans */}
          <Card className="flex flex-col gap-3">
            <div className="flex items-start justify-between">
              <div
                className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: 'var(--color-success-bg)', color: 'var(--color-success)' }}
              >
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <Sparkline
                values={scanTimeline.map((d) => d.completed).slice(-6)}
                color="var(--color-success)"
              />
            </div>
            <div>
              <p className={PagesFontSize.cardTitle}>Completed</p>
              <p className="text-2xl font-bold font-mono" style={{ color: 'var(--color-text-primary)' }}>
                {scanSummary?.completed ?? 0}
              </p>
              <p className="text-[10px] mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                {scanSummary && scanSummary.total > 0
                  ? `${((scanSummary.completed / scanSummary.total) * 100).toFixed(0)}% success rate`
                  : 'No scans yet'}
              </p>
            </div>
          </Card>

          {/* Failed Scans */}
          <Card className="flex flex-col gap-3">
            <div className="flex items-start justify-between">
              <div
                className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: 'var(--color-danger-bg)', color: 'var(--color-danger)' }}
              >
                <XCircle className="w-4 h-4" />
              </div>
              <Sparkline
                values={scanTimeline.map((d) => d.failed).slice(-6)}
                color="var(--color-danger)"
              />
            </div>
            <div>
              <p className={PagesFontSize.cardTitle}>Failed</p>
              <p className="text-2xl font-bold font-mono" style={{ color: 'var(--color-text-primary)' }}>
                {scanSummary?.failed ?? 0}
              </p>
              <p className="text-[10px] mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                {scanSummary?.queued ?? 0} queued
              </p>
            </div>
          </Card>

          {/* Active Findings */}
          <Card className="flex flex-col gap-3">
            <div className="flex items-start justify-between">
              <div
                className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: 'var(--color-warning-bg)', color: 'var(--color-warning)' }}
              >
                <AlertTriangle className="w-4 h-4" />
              </div>
              <TrendingDown className="w-4 h-4" style={{ color: 'var(--color-success)' }} />
            </div>
            <div>
              <p className={PagesFontSize.cardTitle}>Active Findings</p>
              <p className="text-2xl font-bold font-mono" style={{ color: 'var(--color-text-primary)' }}>
                {findingsStats?.totalActive ?? 0}
              </p>
              <p className="text-[10px] mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                {findingsStats?.criticalActive ?? 0} critical
              </p>
            </div>
          </Card>

          {/* Resolved This Week */}
          <Card className="flex flex-col gap-3">
            <div className="flex items-start justify-between">
              <div
                className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: 'var(--color-success-bg)', color: 'var(--color-success)' }}
              >
                <Shield className="w-4 h-4" />
              </div>
              <TrendingUp className="w-4 h-4" style={{ color: 'var(--color-success)' }} />
            </div>
            <div>
              <p className={PagesFontSize.cardTitle}>Resolved / Week</p>
              <p className="text-2xl font-bold font-mono" style={{ color: 'var(--color-text-primary)' }}>
                {findingsStats?.resolvedThisWeek ?? 0}
              </p>
              <p className="text-[10px] mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                {findingsStats?.avgHoursToResolution
                  ? `~${findingsStats.avgHoursToResolution}h avg resolution`
                  : 'No resolutions yet'}
              </p>
            </div>
          </Card>
        </div>

        {/* ═══════════════════════════════════════════
            Row 2 — Scan Distribution + Findings Breakdown
        ════════════════════════════════════════════ */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Scan Status Distribution */}
          <Card>
            <div className="flex items-center justify-between mb-5">
              <div>
                <p className={PagesFontSize.cardTitle}>Scan Distribution</p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                  Status breakdown across all scans
                </p>
              </div>
              <button
                onClick={() => navigate('/scans')}
                className="flex items-center gap-1 text-[10px] font-semibold transition-colors"
                style={{ color: 'var(--color-accent)' }}
              >
                View all <ChevronRight className="w-3 h-3" />
              </button>
            </div>

            <div className="flex items-center gap-8">
              {/* Donut */}
              <div className="relative flex-shrink-0">
                <DonutChart segments={scanDonutSegments} size={128} strokeWidth={16} />
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <p className="text-xl font-bold font-mono" style={{ color: 'var(--color-text-primary)' }}>
                    {scanSummary?.total ?? 0}
                  </p>
                  <p className="text-[9px] font-bold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>
                    total
                  </p>
                </div>
              </div>

              {/* Legend */}
              <div className="flex flex-col gap-3 flex-1">
                {[
                  { label: 'Completed', value: scanSummary?.completed ?? 0, color: 'var(--color-success)', bg: 'var(--color-success-bg)' },
                  { label: 'Running', value: scanSummary?.running ?? 0, color: 'var(--color-info)', bg: 'var(--color-info-bg)' },
                  { label: 'Queued', value: scanSummary?.queued ?? 0, color: 'var(--color-warning)', bg: 'var(--color-warning-bg)' },
                  { label: 'Failed', value: scanSummary?.failed ?? 0, color: 'var(--color-danger)', bg: 'var(--color-danger-bg)' },
                ].map(({ label, value, color, bg }) => (
                  <div key={label} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{ background: color }}
                      />
                      <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>{label}</span>
                    </div>
                    <span
                      className="text-xs font-bold font-mono px-1.5 py-0.5 rounded"
                      style={{ background: bg, color }}
                    >
                      {value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </Card>

          {/* Findings Severity Breakdown */}
          <Card>
            <div className="flex items-center justify-between mb-5">
              <div>
                <p className={PagesFontSize.cardTitle}>Active Findings by Severity</p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                  Open, investigating & in-progress findings
                </p>
              </div>
              <button
                onClick={() => navigate('/findings')}
                className="flex items-center gap-1 text-[10px] font-semibold transition-colors"
                style={{ color: 'var(--color-accent)' }}
              >
                View all <ChevronRight className="w-3 h-3" />
              </button>
            </div>

            <div className="flex items-center gap-8">
              {/* Donut */}
              <div className="relative flex-shrink-0">
                <DonutChart segments={findingsDonutSegments} size={128} strokeWidth={16} />
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <p className="text-xl font-bold font-mono" style={{ color: 'var(--color-text-primary)' }}>
                    {findingsStats?.totalActive ?? 0}
                  </p>
                  <p className="text-[9px] font-bold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>
                    active
                  </p>
                </div>
              </div>

              {/* Severity bars */}
              <div className="flex flex-col gap-2.5 flex-1">
                <SeverityBar
                  label="Critical"
                  value={findingsStats?.criticalActive ?? 0}
                  total={findingsStats?.totalActive ?? 0}
                  color="#7B1D1D"
                />
                <SeverityBar
                  label="High"
                  value={findingsStats?.highActive ?? 0}
                  total={findingsStats?.totalActive ?? 0}
                  color="var(--color-danger)"
                />
                <SeverityBar
                  label="Medium"
                  value={findingsStats?.mediumActive ?? 0}
                  total={findingsStats?.totalActive ?? 0}
                  color="var(--color-warning)"
                />
                <SeverityBar
                  label="Low"
                  value={findingsStats?.lowActive ?? 0}
                  total={findingsStats?.totalActive ?? 0}
                  color="var(--color-success)"
                />
                <SeverityBar
                  label="Info"
                  value={findingsStats?.infoActive ?? 0}
                  total={findingsStats?.totalActive ?? 0}
                  color="var(--color-info)"
                />
              </div>
            </div>
          </Card>
        </div>

        {/* ═══════════════════════════════════════════
            Row 3 — Scan Timeline (14-day bar chart)
        ════════════════════════════════════════════ */}
        <Card>
          <div className="flex items-center justify-between mb-6">
            <div>
              <p className={PagesFontSize.cardTitle}>Scan Activity — Last 14 Days</p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                Completed vs failed scans per day
              </p>
            </div>
            <div className="flex items-center gap-4 text-[10px] font-semibold uppercase tracking-wider">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm" style={{ background: 'var(--color-success)' }} />
                <span style={{ color: 'var(--color-text-muted)' }}>Completed</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm" style={{ background: 'var(--color-danger)' }} />
                <span style={{ color: 'var(--color-text-muted)' }}>Failed</span>
              </div>
            </div>
          </div>

          {/* Bar chart */}
          <div className="flex items-end gap-1.5 h-28 w-full">
            {scanTimeline.map((day, idx) => {
              const completedH = timelineMax > 0 ? (day.completed / timelineMax) * 100 : 0;
              const failedH = timelineMax > 0 ? (day.failed / timelineMax) * 100 : 0;
              return (
                <div key={idx} className="flex-1 flex flex-col items-center gap-0.5 group" title={day.label}>
                  <div className="w-full flex flex-col justify-end gap-0.5" style={{ height: '96px' }}>
                    {day.failed > 0 && (
                      <div
                        className="w-full rounded-t-sm transition-all duration-500"
                        style={{
                          height: `${failedH}%`,
                          background: 'var(--color-danger)',
                          opacity: 0.85,
                        }}
                      />
                    )}
                    {day.completed > 0 && (
                      <div
                        className="w-full rounded-t-sm transition-all duration-500"
                        style={{
                          height: `${completedH}%`,
                          background: 'var(--color-success)',
                          opacity: 0.85,
                        }}
                      />
                    )}
                    {day.completed === 0 && day.failed === 0 && (
                      <div
                        className="w-full rounded-sm"
                        style={{ height: '3px', background: 'var(--color-border)' }}
                      />
                    )}
                  </div>
                  {/* X-axis label – show every other day to avoid crowding */}
                  {idx % 2 === 0 && (
                    <span
                      className="text-[8px] font-mono whitespace-nowrap"
                      style={{ color: 'var(--color-text-muted)' }}
                    >
                      {day.label.split(' ')[1]}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </Card>

        {/* ═══════════════════════════════════════════
            Row 4 — Asset Overview + Security Posture
        ════════════════════════════════════════════ */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Asset breakdown */}
          <Card>
            <div className="flex items-center justify-between mb-5">
              <p className={PagesFontSize.cardTitle}>Assets Overview</p>
              <button
                onClick={() => navigate('/assets')}
                className="flex items-center gap-1 text-[10px] font-semibold"
                style={{ color: 'var(--color-accent)' }}
              >
                View <ChevronRight className="w-3 h-3" />
              </button>
            </div>
            <div className="space-y-3">
              {/* Website */}
              <div className="flex items-center justify-between p-3 rounded-lg" style={{ background: 'var(--color-bg-secondary)' }}>
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'var(--color-info-bg)', color: 'var(--color-info)' }}>
                    <Globe className="w-3.5 h-3.5" />
                  </div>
                  <p className="text-xs font-semibold" style={{ color: 'var(--color-text-primary)' }}>Websites</p>
                </div>
                <p className="text-sm font-bold font-mono" style={{ color: 'var(--color-text-primary)' }}>
                  {assetTypeBreakdown.websites}
                </p>
              </div>
              {/* Repository */}
              <div className="flex items-center justify-between p-3 rounded-lg" style={{ background: 'var(--color-bg-secondary)' }}>
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'var(--color-accent-subtle)', color: 'var(--color-accent)' }}>
                    <GitBranch className="w-3.5 h-3.5" />
                  </div>
                  <p className="text-xs font-semibold" style={{ color: 'var(--color-text-primary)' }}>Repositories</p>
                </div>
                <p className="text-sm font-bold font-mono" style={{ color: 'var(--color-text-primary)' }}>
                  {assetTypeBreakdown.repos}
                </p>
              </div>

              <div className="border-t pt-3" style={{ borderColor: 'var(--color-divider)' }}>
                <p className={PagesFontSize.cardTitle + ' mb-3'}>Security Posture</p>
                <div className="space-y-2">
                  {[
                    { label: 'Good', count: postureBreakdown.GOOD, color: 'var(--color-success)', bg: 'var(--color-success-bg)' },
                    { label: 'Moderate', count: postureBreakdown.MODERATE, color: 'var(--color-warning)', bg: 'var(--color-warning-bg)' },
                    { label: 'Poor', count: postureBreakdown.POOR, color: 'var(--color-danger)', bg: 'var(--color-danger-bg)' },
                    { label: 'Critical', count: postureBreakdown.CRITICAL, color: '#7B1D1D', bg: 'var(--color-danger-bg)' },
                    { label: 'Unknown', count: postureBreakdown.UNKNOWN, color: 'var(--color-text-muted)', bg: 'var(--color-bg-muted)' },
                  ].map(({ label, count, color, bg }) => (
                    <div key={label} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full" style={{ background: color }} />
                        <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>{label}</span>
                      </div>
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded font-mono" style={{ background: bg, color }}>{count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Card>

          {/* Top Vulnerable Assets */}
          <Card className="lg:col-span-2">
            <div className="flex items-center justify-between mb-5">
              <div>
                <p className={PagesFontSize.cardTitle}>Top Vulnerable Assets</p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                  Assets with the most critical findings
                </p>
              </div>
              <button
                onClick={() => navigate('/assets')}
                className="flex items-center gap-1 text-[10px] font-semibold"
                style={{ color: 'var(--color-accent)' }}
              >
                View all <ChevronRight className="w-3 h-3" />
              </button>
            </div>

            {topVulnerableAssets.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 gap-3">
                <Shield className="w-8 h-8" style={{ color: 'var(--color-success)' }} />
                <p className="text-sm font-semibold" style={{ color: 'var(--color-text-secondary)' }}>
                  No critical findings found
                </p>
                <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                  All assets are in good standing
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {topVulnerableAssets.map((asset) => {
                  const maxFindings = topVulnerableAssets[0]?.critical_findings || 1;
                  const barPct = (asset.critical_findings / maxFindings) * 100;
                  return (
                    <div
                      key={asset.id}
                      className="flex items-center gap-4 p-3 rounded-xl cursor-pointer transition-all"
                      style={{ background: 'var(--color-bg-secondary)' }}
                      onClick={() => navigate(`/assets/${asset.id}`)}
                      onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--color-hover)')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--color-bg-secondary)')}
                    >
                      {/* Icon */}
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{ background: 'var(--color-danger-bg)', color: 'var(--color-danger)' }}
                      >
                        {asset.type === 'WEBSITE' ? (
                          <Globe className="w-3.5 h-3.5" />
                        ) : (
                          <GitBranch className="w-3.5 h-3.5" />
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p
                          className="text-xs font-semibold truncate"
                          style={{ color: 'var(--color-text-primary)' }}
                        >
                          {asset.name}
                        </p>
                        <div
                          className="h-1 mt-1.5 rounded-full overflow-hidden w-full"
                          style={{ background: 'var(--color-border)' }}
                        >
                          <div
                            className="h-full rounded-full transition-all duration-700"
                            style={{ width: `${barPct}%`, background: 'var(--color-danger)' }}
                          />
                        </div>
                      </div>

                      {/* Badges */}
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <PostureBadge posture={asset.security_posture} />
                        <span
                          className="text-xs font-bold font-mono px-2 py-0.5 rounded"
                          style={{ background: 'var(--color-danger-bg)', color: 'var(--color-danger)' }}
                        >
                          {asset.critical_findings} crit
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>

        {/* ═══════════════════════════════════════════
            Row 5 — Recent Scan Activity
        ════════════════════════════════════════════ */}
        <Card>
          <div className="flex items-center justify-between mb-5">
            <div>
              <p className={PagesFontSize.cardTitle}>Recent Scan Activity</p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                Latest 8 scan events across all assets
              </p>
            </div>
            <button
              onClick={() => navigate('/scans')}
              className="flex items-center gap-1 text-[10px] font-semibold"
              style={{ color: 'var(--color-accent)' }}
            >
              View all scans <ChevronRight className="w-3 h-3" />
            </button>
          </div>

          {recentScans.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 gap-3">
              <Zap className="w-8 h-8" style={{ color: 'var(--color-text-muted)' }} />
              <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                No scans yet. Start your first scan to see activity here.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--color-divider)' }}>
                    {['Target', 'Type', 'Status', 'Started', ''].map((h) => (
                      <th
                        key={h}
                        className="text-left pb-2.5 pr-4"
                        style={{
                          fontSize: '10px',
                          fontWeight: 700,
                          textTransform: 'uppercase',
                          letterSpacing: '0.08em',
                          color: 'var(--color-text-muted)',
                          fontFamily: 'var(--font-body)',
                        }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {recentScans.map((scan: ScanRecord, idx: number) => (
                    <tr
                      key={scan.id}
                      className="group cursor-pointer transition-all"
                      style={{
                        borderBottom: idx < recentScans.length - 1 ? '1px solid var(--color-divider)' : 'none',
                      }}
                      onClick={() => navigate(`/scan/${scan.id}/results`)}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.background = 'var(--color-hover)')
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.background = 'transparent')
                      }
                    >
                      <td className="py-2.5 pr-4">
                        <div>
                          <p className="text-xs font-semibold truncate max-w-[200px]" style={{ color: 'var(--color-text-primary)' }}>
                            {scan.target.name}
                          </p>
                          <p className="text-[10px] truncate max-w-[200px]" style={{ color: 'var(--color-text-muted)' }}>
                            {scan.target.url}
                          </p>
                        </div>
                      </td>
                      <td className="py-2.5 pr-4">
                        <span className="text-[10px] font-mono font-bold uppercase" style={{ color: 'var(--color-text-muted)' }}>
                          {scan.scanType || 'full'}
                        </span>
                      </td>
                      <td className="py-2.5 pr-4">
                        <StatusBadge status={scan.status} />
                      </td>
                      <td className="py-2.5 pr-4">
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3 h-3" style={{ color: 'var(--color-text-muted)' }} />
                          <span className="text-[10px] font-mono" style={{ color: 'var(--color-text-muted)' }}>
                            {formatRelativeTime(scan.createdAt)}
                          </span>
                        </div>
                      </td>
                      <td className="py-2.5">
                        <ChevronRight
                          className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity"
                          style={{ color: 'var(--color-text-muted)' }}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

      </div>
    </DashboardLayout>
  );
}
