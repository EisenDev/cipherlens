import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Button,
  Badge,
  SectionContainer,
  SectionHeader,
  staggerContainer,
  fadeInUp,
  fadeInRight,
  IconWrapper,
} from '../components/ui';
import { Navbar } from '../components/Navbar';
import { Footer } from '../components/Footer';
import { useAuthStore } from '../store/useAuthStore';

// ─────────────────────────────────────────────
// Custom UI Components & Icons
// ─────────────────────────────────────────────

// Checkmark icon for bullet points
function CheckIcon() {
  return (
    <svg className="w-4 h-4 text-accent flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}

// Red cross icon for comparisons
function CrossIcon() {
  return (
    <svg className="w-4 h-4 text-red-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

// ─────────────────────────────────────────────
// Hero Dashboard Mockup Component
// ─────────────────────────────────────────────
function DashboardMockup() {
  const scans = [
    { target: 'acme.com', type: 'web', status: 'Completed', time: '2m ago', score: 91 },
    { target: 'github.com/acme/backend', type: 'repo', status: 'Completed', time: '14m ago', score: 74 },
    { target: 'dashboord.acme.io', type: 'web', status: 'Completed', time: '1h ago', score: 96 },
    { target: 'api.acme.com', type: 'web', status: 'In Progress', time: 'Now', score: 88 },
  ];

  const risks = [
    { label: 'Secrets Exposure', val: 'Critical', color: 'bg-red-600', w: 'w-full' },
    { label: 'Dependency Risk', val: 'High', color: 'bg-amber-500', w: 'w-3/4' },
    { label: 'Security Headers', val: 'Medium', color: 'bg-yellow-500', w: 'w-1/2' },
    { label: 'SSL / TLS Issues', val: 'Low', color: 'bg-emerald-600', w: 'w-1/3' },
    { label: 'Info Exposure', val: 'Low', color: 'bg-emerald-600', w: 'w-1/5' },
  ];

  return (
    <motion.div
      variants={fadeInRight}
      initial="hidden"
      animate="visible"
      className="relative w-full"
    >
      {/* Soft Ambient Background Glow */}
      <div
        className="absolute -inset-4 rounded-3xl pointer-events-none opacity-20"
        style={{
          background: 'radial-gradient(ellipse at 50% 50%, var(--color-accent) 0%, transparent 70%)',
        }}
      />

      <div
        className="relative rounded-2xl overflow-hidden bg-white"
        style={{
          border: '1px solid var(--color-border)',
          boxShadow: 'var(--shadow-panel)',
        }}
      >
        {/* Top Window Bar */}
        <div
          className="flex items-center gap-1.5 px-4 py-3 border-b"
          style={{ borderColor: 'var(--color-border)', background: 'var(--color-bg-secondary)' }}
        >
          <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
          <div className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
          <div className="w-2.5 h-2.5 rounded-full bg-green-400" />
          <div className="flex items-center gap-1.5 ml-3">
            <svg className="w-3.5 h-3.5 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
            </svg>
            <span className="text-[11px] font-medium" style={{ color: 'var(--color-text-secondary)', fontFamily: 'var(--font-body)' }}>
              CipherLens Dashboard
            </span>
          </div>
        </div>

        {/* Dashboard Body */}
        <div className="grid grid-cols-12">
          {/* Left Navigation Bar */}
          <div className="col-span-1 border-r flex flex-col items-center py-4 gap-4 bg-bg-primary" style={{ borderColor: 'var(--color-border)' }}>
            {[
              { id: 'shield', active: true },
              { id: 'dashboard', active: false },
              { id: 'search', active: false },
              { id: 'scanner', active: false },
              { id: 'queue', active: false },
              { id: 'report', active: false },
              { id: 'org', active: false },
              { id: 'settings', active: false },
            ].map((item, idx) => (
              <div
                key={idx}
                className="w-7 h-7 rounded-lg flex items-center justify-center cursor-pointer transition-colors"
                style={{
                  background: item.active ? 'var(--color-accent-subtle)' : 'transparent',
                  border: item.active ? '1px solid var(--color-accent-light)' : 'none',
                  color: item.active ? 'var(--color-accent)' : 'var(--color-text-muted)',
                }}
              >
                <div
                  className="w-3 h-3 rounded-sm"
                  style={{ background: item.active ? 'var(--color-accent)' : 'var(--color-border-strong)' }}
                />
              </div>
            ))}
          </div>

          {/* Main Dashboard Space */}
          <div className="col-span-11 p-5 space-y-4">
            {/* Top Score & Stats row */}
            <div className="grid grid-cols-12 gap-3">
              {/* Score Box */}
              <div
                className="col-span-8 rounded-xl p-3.5 flex items-center justify-between"
                style={{ background: 'var(--color-bg-primary)', border: '1px solid var(--color-border)' }}
              >
                <div className="space-y-1">
                  <p className="text-[10px] text-text-muted" style={{ fontFamily: 'var(--font-body)' }}>Overall Security Score</p>
                  <div className="flex items-end gap-2">
                    <span className="text-3xl font-light leading-none" style={{ fontFamily: 'var(--font-heading)', color: 'var(--color-text-primary)' }}>82</span>
                    <span className="text-[10px] text-text-muted mb-0.5" style={{ fontFamily: 'var(--font-body)' }}>/100</span>
                    <span className="text-[10px] font-semibold text-emerald-600 mb-0.5" style={{ fontFamily: 'var(--font-body)' }}>↑ 12 pts</span>
                  </div>
                </div>

                {/* Score Dial (Progress Circle) */}
                <div className="relative w-14 h-14">
                  <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                    <circle cx="18" cy="18" r="15.9155" fill="none" stroke="#E5E3DE" strokeWidth="3" />
                    {/* Ring showing color segments */}
                    <circle cx="18" cy="18" r="15.9155" fill="none" stroke="var(--color-danger)" strokeWidth="3" strokeDasharray="15 85" strokeDashoffset="0" />
                    <circle cx="18" cy="18" r="15.9155" fill="none" stroke="var(--color-warning)" strokeWidth="3" strokeDasharray="25 75" strokeDashoffset="-15" />
                    <circle cx="18" cy="18" r="15.9155" fill="none" stroke="var(--color-success)" strokeWidth="3" strokeDasharray="42 58" strokeDashoffset="-40" />
                  </svg>
                </div>
              </div>

              {/* Counts Box (2x2 grid) */}
              <div className="col-span-4 grid grid-cols-2 gap-2">
                {[
                  { label: 'Critical', val: '1', color: 'text-red-700', bg: 'bg-red-50' },
                  { label: 'High', val: '4', color: 'text-amber-600', bg: 'bg-amber-50' },
                  { label: 'Medium', val: '11', color: 'text-yellow-600', bg: 'bg-yellow-50' },
                  { label: 'Low', val: '28', color: 'text-emerald-700', bg: 'bg-emerald-50' },
                ].map((stat) => (
                  <div
                    key={stat.label}
                    className={`rounded-xl p-2 text-center border ${stat.bg}`}
                    style={{ borderColor: 'var(--color-border)' }}
                  >
                    <p className={`text-base font-bold leading-none ${stat.color}`} style={{ fontFamily: 'var(--font-body)' }}>{stat.val}</p>
                    <p className="text-[9px] text-text-muted mt-0.5" style={{ fontFamily: 'var(--font-body)' }}>{stat.label}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Middle Row: Scans & Top Risk Categories */}
            <div className="grid grid-cols-12 gap-3">
              {/* Recent scans */}
              <div className="col-span-7 space-y-1.5">
                <p className="text-[10px] font-bold text-text-primary uppercase tracking-wider mb-1" style={{ fontFamily: 'var(--font-body)' }}>Recent Scan Activity</p>
                <div className="space-y-1">
                  {scans.map((s, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-2 p-2 rounded-lg bg-bg-primary"
                      style={{ border: '1px solid var(--color-border)' }}
                    >
                      <span className="text-[10px] flex-shrink-0">{s.type === 'web' ? '🌐' : '📦'}</span>
                      <span className="text-[10px] font-medium text-text-secondary flex-1 truncate" style={{ fontFamily: 'var(--font-body)' }}>{s.target}</span>
                      <span
                        className="text-[8px] font-semibold px-1.5 py-0.5 rounded flex-shrink-0"
                        style={{
                          color: s.status === 'Completed' ? 'var(--color-success)' : 'var(--color-warning)',
                          background: s.status === 'Completed' ? 'var(--color-success-bg)' : 'var(--color-warning-bg)',
                        }}
                      >
                        {s.status}
                      </span>
                      <span className="text-[9px] text-text-muted flex-shrink-0" style={{ fontFamily: 'var(--font-body)' }}>{s.time}</span>
                      <span className="text-[10px] font-bold text-text-primary flex-shrink-0 w-5 text-right" style={{ fontFamily: 'var(--font-body)' }}>{s.score}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Risk categories */}
              <div className="col-span-5 space-y-1.5">
                <p className="text-[10px] font-bold text-text-primary uppercase tracking-wider mb-1" style={{ fontFamily: 'var(--font-body)' }}>Top Risk Categories</p>
                <div className="space-y-2">
                  {risks.map((r, idx) => (
                    <div key={idx} className="space-y-0.5">
                      <div className="flex items-center justify-between text-[9px] text-text-secondary" style={{ fontFamily: 'var(--font-body)' }}>
                        <span className="font-medium truncate mr-1">{r.label}</span>
                        <span className="font-semibold text-text-muted">{r.val}</span>
                      </div>
                      <div className="h-1 w-full rounded-full bg-bg-secondary overflow-hidden">
                        <div className={`h-1 rounded-full ${r.color} ${r.w}`} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Bottom Row: AI Executive Summary */}
            <div
              className="rounded-xl p-3 flex gap-3 items-start"
              style={{ background: 'var(--color-accent-subtle)', border: '1px solid var(--color-accent-light)' }}
            >
              <div className="flex items-center gap-1.5 flex-shrink-0 text-accent mt-0.5">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                </svg>
                <span className="text-[9px] font-bold uppercase tracking-wider" style={{ fontFamily: 'var(--font-body)' }}>AI Executive Summary</span>
              </div>
              <p className="text-[10px] leading-relaxed text-text-secondary flex-1" style={{ fontFamily: 'var(--font-body)' }}>
                One critical secret exposure detected in production configuration. High-risk outdated dependencies found in backend service. Overall risk trending down after recent remediation.
              </p>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────
// Engine SVG Icon Components (custom monochrome matching brand)
// ─────────────────────────────────────────────
const engineIcons: Record<string, React.ReactNode> = {
  nuclei: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-6 h-6">
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="3.5" />
      <line x1="12" y1="1.5" x2="12" y2="6" strokeLinecap="round" />
      <line x1="12" y1="18" x2="12" y2="22.5" strokeLinecap="round" />
      <line x1="1.5" y1="12" x2="6" y2="12" strokeLinecap="round" />
      <line x1="18" y1="12" x2="22.5" y2="12" strokeLinecap="round" />
    </svg>
  ),
  semgrep: (
    <svg viewBox="0 0 32 24" fill="none" stroke="currentColor" strokeWidth={1.6} className="w-8 h-6">
      <circle cx="6" cy="12" r="5" />
      <circle cx="16" cy="12" r="5" />
      <circle cx="26" cy="12" r="5" />
    </svg>
  ),
  gitleaks: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-6 h-6">
      <circle cx="12" cy="12" r="9" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12h-3v2.5h3v-1h-2v-2h3V9.5A1.5 1.5 0 0013.5 8h-4A1.5 1.5 0 008 9.5v5A1.5 1.5 0 009.5 16H15V12z" fill="currentColor" stroke="none" />
    </svg>
  ),
  trivy: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-6 h-6">
      <polyline points="12,3 21,8 21,16 12,21 3,16 3,8 12,3" strokeLinejoin="round" />
      <line x1="12" y1="3" x2="12" y2="12" strokeLinecap="round" />
      <line x1="3" y1="8" x2="12" y2="12" />
      <line x1="21" y1="8" x2="12" y2="12" />
    </svg>
  ),
  katana: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-6 h-6">
      <line x1="12" y1="3" x2="12" y2="21" strokeLinecap="round" />
      <line x1="3"  y1="7.5" x2="21" y2="16.5" strokeLinecap="round" />
      <line x1="21" y1="7.5" x2="3"  y2="16.5" strokeLinecap="round" />
    </svg>
  ),
  httpx: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} className="w-6 h-6">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 7L3 12l3 5" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M18 7l3 5-3 5" />
      <polyline strokeLinecap="round" strokeLinejoin="round" points="13,5 10,12 13,12 11,19" />
    </svg>
  ),
  owasp: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-6 h-6">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 3 Q16.5 12 12 21" strokeLinecap="round" fill="none" />
      <path d="M12 3 Q7.5 12 12 21" strokeLinecap="round" fill="none" />
      <line x1="3.5" y1="9" x2="20.5" y2="9" />
      <line x1="3.5" y1="15" x2="20.5" y2="15" />
    </svg>
  ),
  sslyze: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-6 h-6">
      <circle cx="12" cy="12" r="9" />
      <rect x="9" y="12" width="6" height="5" rx="1" />
      <path strokeLinecap="round" d="M10 12V10a2 2 0 014 0v2" />
    </svg>
  ),
  osv: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-6 h-6">
      <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 5.625c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125" />
    </svg>
  ),
  retirejs: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-6 h-6">
      <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5" />
    </svg>
  ),
  bandit: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-6 h-6">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
    </svg>
  ),
  ganalysis: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-6 h-6">
      <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 3.75H6A2.25 2.25 0 003.75 6v1.5M7.5 3.75h9M7.5 3.75V3A.75.75 0 018.25 2.25h7.5A.75.75 0 0116.5 3v.75m0 0H18A2.25 2.25 0 0120.25 6v1.5m-16.5 0V18A2.25 2.25 0 006 20.25h12A2.25 2.25 0 0020.25 18V7.5m-16.5 0h16.5" />
    </svg>
  ),
  gitanalysis: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-6 h-6">
      <circle cx="18" cy="18" r="3" />
      <circle cx="6" cy="6" r="3" />
      <line x1="6" y1="9" x2="6" y2="18" />
      <path d="M6 18a3 3 0 003 3h6" />
    </svg>
  ),
};

const enginesList = [
  { name: 'nuclei', icon: engineIcons.nuclei },
  { name: 'Semgrep', icon: engineIcons.semgrep },
  { name: 'Gitleaks', icon: engineIcons.gitleaks },
  { name: 'trivy', icon: engineIcons.trivy },
  { name: 'katana', icon: engineIcons.katana },
  { name: 'httpx', icon: engineIcons.httpx },
  { name: 'OWASP ZAP', icon: engineIcons.owasp },
  { name: 'SSLyze', icon: engineIcons.sslyze },
  { name: 'OSV', icon: engineIcons.osv },
  { name: 'RetireJS', icon: engineIcons.retirejs },
  { name: 'Bandit', icon: engineIcons.bandit },
  { name: 'Ganalysis', icon: engineIcons.ganalysis },
  { name: 'Git Analysis', icon: engineIcons.gitanalysis },
];

// ─────────────────────────────────────────────
// Landing Page V2 Rebuild Page
// ─────────────────────────────────────────────
export default function LandingPage() {
  const { accessToken } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (accessToken) {
      navigate('/scans');
    }
  }, [accessToken, navigate]);

  // ─── Feature Card data (bullets match exactly) ────────────
  const featureCards = [
    {
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <circle cx="12" cy="12" r="9" />
          <circle cx="12" cy="12" r="3" />
          <line x1="12" y1="2" x2="12" y2="6" strokeLinecap="round" />
          <line x1="12" y1="18" x2="12" y2="22" strokeLinecap="round" />
          <line x1="2" y1="12" x2="6" y2="12" strokeLinecap="round" />
          <line x1="18" y1="12" x2="22" y2="12" strokeLinecap="round" />
        </svg>
      ),
      title: 'Website Intelligence',
      description: 'Deep audits of your web assets, attack surface, network security, SSL/TLS, and technologies.',
      bullets: [
        'SSL, TLS & Certificate Analysis',
        'Security Headers & Misconfigurations',
        'DNS, Ports & Service Discovery',
        'Technology Fingerprinting',
        'OWASP Top 10 & More',
      ],
    },
    {
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5" />
        </svg>
      ),
      title: 'Repository Intelligence',
      description: 'Understand your codebase, dependencies, secrets, and developer risks.',
      bullets: [
        'Secrets & API Key Detection',
        'Dependency & License Audits',
        'Commit & Code Quality Analysis',
        'Bus Factor & Developer Risk',
        'CI/CD & Branch Protection',
      ],
    },
    {
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
        </svg>
      ),
      title: 'AI-Powered Analysis',
      description: 'AI turns raw findings into clear, prioritized insights and actionable recommendations.',
      bullets: [
        'Executive Summaries',
        'Risk Prioritization',
        'Remediation Guidance',
        'Evidence Correlation',
        'Business Impact Analysis',
      ],
    },
  ];

  // ─── How it works timeline pipeline stages ─────────────────
  const timelineStages = [
    {
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <circle cx="12" cy="12" r="9" />
          <line x1="3.6" y1="15" x2="20.4" y2="15" />
          <line x1="3.6" y1="9" x2="20.4" y2="9" />
          <path d="M12 3c-2.5 4-2.5 14 0 18" />
          <path d="M12 3c2.5 4 2.5 14 0 18" />
        </svg>
      ),
      title: 'Targets',
      desc: 'Web, Repo, CLI, API',
    },
    {
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15m15 0a7.5 7.5 0 11-15 0 7.5 7.5 0 0115 0z" />
          <path strokeLinecap="round" d="M12 12l4.5 4.5m0-9L12 12l-4.5 4.5m0-9L12 12" />
        </svg>
      ),
      title: 'Crawler Engine',
      desc: 'Discover & collect attack surface',
    },
    {
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
        </svg>
      ),
      title: 'Security Engines',
      desc: '12+ Industry-leading scanners',
    },
    {
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5A3.375 3.375 0 0010.125 2.25H3.75A1.875 1.875 0 001.875 4.125v15.75c0 1.035.84 1.875 1.875 1.875h12.75A1.875 1.875 0 0018.375 19.875V14.25z" />
        </svg>
      ),
      title: 'Evidence Collector',
      desc: 'Raw data & artifacts',
    },
    {
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
        </svg>
      ),
      title: 'Normalization',
      desc: 'Standardize & structure data',
    },
    {
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
        </svg>
      ),
      title: 'Risk Engine',
      desc: 'Correlate & score real risk',
    },
    {
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
        </svg>
      ),
      title: 'AI Intelligence',
      desc: 'Explain, prioritize & recommend',
    },
    {
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6M7 4H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V8l-5-4H7z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 4v4h4" />
        </svg>
      ),
      title: 'Executive Report',
      desc: 'Clear reports & dashboards',
    },
  ];

  // ─── Executive Report Preview data ────────────────────────
  const executiveFindings = [
    { label: 'Hardcoded API Key in /config/production.env', sev: 'CRITICAL', color: 'text-red-600 bg-red-50 border-red-200' },
    { label: 'Outdated Dependency (lodash 4.17.11)', sev: 'HIGH', color: 'text-amber-600 bg-amber-50 border-amber-200' },
    { label: 'Missing Content Security Policy Header', sev: 'HIGH', color: 'text-amber-600 bg-amber-50 border-amber-200' },
    { label: 'SSL Certificate expiring in 14 days', sev: 'MEDIUM', color: 'text-blue-600 bg-blue-50 border-blue-200' },
    { label: 'X-Frame-Options not configured', sev: 'MEDIUM', color: 'text-blue-600 bg-blue-50 border-blue-200' },
  ];

  // ─── Why CipherLens lists ─────────────────────────────────
  const traditionalPoints = [
    'Point vulnerabilities',
    'Single tool output',
    'No correlation',
    'No business context',
    'No AI explanations',
    'Manual report creation',
    'No evidence tracking',
  ];

  const cipherLensAdvantages = [
    'Correlates & prioritizes risks',
    'Multi-engine intelligence',
    'Risk & attack path correlation',
    'Business impact analysis',
    'AI-powered explanations',
    'Executive-grade reports',
    'Evidence preserved & immutable',
  ];

  // ─── Coming Soon roadmap items ────────────────────────────
  const roadmapItems = [
    { label: 'Docker Security', icon: '🐳', eta: 'Q3 2026' },
    { label: 'Kubernetes', icon: '☸️', eta: 'Q3 2026' },
    { label: 'AWS Cloud', icon: '☁️', eta: 'Q4 2026' },
    { label: 'Azure Cloud', icon: '🔷', eta: 'Q4 2026' },
    { label: 'GitLab', icon: '🦊', eta: 'Q3 2026' },
    { label: 'Bitbucket', icon: '🪣', eta: 'Q4 2026' },
    { label: 'CI/CD Security', icon: '🔒', eta: 'Q4 2026' },
    { label: 'SBOM', icon: '📋', eta: 'Q1 2027' },
    { label: 'Supply Chain', icon: '🔗', eta: 'Q1 2027' },
    { label: 'Compliance Hub', icon: '🛡️', eta: 'Q1 2027' },
  ];

  return (
    <div className="min-h-screen bg-bg-primary text-text-primary">
      <Navbar />

      {/* ── 1. HERO SECTION ─────────────────────────────────── */}
      <section className="section-padding overflow-hidden">
        <div className="container-main">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left Column: Heading + Copy */}
            <motion.div variants={staggerContainer} initial="hidden" animate="visible">
              <motion.div variants={fadeInUp} className="mb-4">
                <Badge variant="accent" icon={
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                  </svg>
                }>
                  AI SECURITY INTELLIGENCE PLATFORM
                </Badge>
              </motion.div>

              <motion.h1 variants={fadeInUp} className="text-hero mb-6">
                Know What You Deploy.<br />
                <span className="text-accent font-medium">Secure</span> What Matters.
              </motion.h1>

              <motion.p variants={fadeInUp} className="text-body text-lg mb-8 max-w-lg">
                CipherLens unifies website, repository, and infrastructure security into a single intelligence platform powered by industry-leading scanners and AI.
              </motion.p>

              <motion.div variants={fadeInUp} className="flex flex-wrap gap-4 mb-8">
                <Button variant="primary" size="lg" href="/signup">
                  Start Your First Scan →
                </Button>
                <Button variant="secondary" size="lg" href="#docs">
                  Explore Documentation
                </Button>
              </motion.div>

              {/* Badges block */}
              <motion.div variants={fadeInUp} className="flex flex-wrap gap-4">
                {[
                  '12+ Security Engines',
                  'AI-Powered Analysis',
                  'Evidence-Based',
                  'Enterprise Ready',
                ].map((b, idx) => (
                  <span
                    key={idx}
                    className="flex items-center gap-1.5 text-xs font-semibold"
                    style={{ color: 'var(--color-text-secondary)', fontFamily: 'var(--font-body)' }}
                  >
                    <div className="w-4 h-4 rounded-full flex items-center justify-center bg-accent-subtle border border-accent-light">
                      <svg className="w-2.5 h-2.5 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    {b}
                  </span>
                ))}
              </motion.div>
            </motion.div>

            {/* Right Column: Dashboard Mockup */}
            <DashboardMockup />
          </div>
        </div>
      </section>

      {/* ── 2. FEATURE CARDS ─────────────────────────────────── */}
      <SectionContainer bg="secondary" id="features">
        <div className="grid md:grid-cols-3 gap-6">
          {featureCards.map((c, idx) => (
            <div
              key={idx}
              className="card bg-white p-8 flex flex-col gap-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-hover"
            >
              <div className="flex items-center gap-3">
                <IconWrapper variant="accent">{c.icon}</IconWrapper>
                <h3 className="text-card-title text-xl font-bold">{c.title}</h3>
              </div>
              <p className="text-sm text-text-secondary leading-relaxed">{c.description}</p>
              <ul className="space-y-2.5">
                {c.bullets.map((b, bIdx) => (
                  <li key={bIdx} className="flex items-center gap-2.5">
                    <CheckIcon />
                    <span className="text-xs font-medium text-text-secondary" style={{ fontFamily: 'var(--font-body)' }}>{b}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </SectionContainer>

      {/* ── 3. HOW IT WORKS / PIPELINE ──────────────────────── */}
      <SectionContainer bg="primary" id="how-it-works">
        <SectionHeader
          eyebrow="HOW IT WORKS"
          title="From Target to Intelligence"
          description="A continuous pipeline that delivers accurate, correlated, and actionable security insights."
        />

        <div className="grid grid-cols-2 md:grid-cols-8 gap-4 items-stretch relative">
          {timelineStages.map((stage, idx) => (
            <div
              key={idx}
              className="flex flex-col items-center text-center p-4 rounded-xl bg-white border border-border-warm relative transition-all duration-300 hover:scale-[1.02] hover:shadow-sm"
            >
              {/* Icon Circle */}
              <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-bg-secondary border border-border-strong text-text-secondary mb-3 flex-shrink-0">
                {stage.icon}
              </div>
              <p className="text-[11px] font-bold text-text-primary leading-tight mb-1" style={{ fontFamily: 'var(--font-body)' }}>{stage.title}</p>
              <p className="text-[9px] text-text-muted leading-tight" style={{ fontFamily: 'var(--font-body)' }}>{stage.desc}</p>

              {/* Connecting line */}
              {idx < timelineStages.length - 1 && (
                <div
                  className="hidden md:block absolute"
                  style={{
                    top: '32px',
                    left: 'calc(50% + 24px)',
                    right: 'calc(-50% + 24px)',
                    height: '1px',
                    background: 'var(--color-border)',
                  }}
                />
              )}
            </div>
          ))}
        </div>

        {/* Info Box */}
        <div
          className="mt-8 mx-auto max-w-xl rounded-xl p-3.5 flex items-center justify-center gap-2.5"
          style={{ background: 'var(--color-accent-subtle)', border: '1px solid var(--color-accent-light)' }}
        >
          <svg className="w-4 h-4 text-accent flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="text-xs text-text-secondary font-medium" style={{ fontFamily: 'var(--font-body)' }}>
            Average scan time: <strong style={{ color: 'var(--color-accent-dark)' }}>2-8 minutes</strong> depending on target size and depth. All evidence is preserved and immutable.
          </span>
        </div>
      </SectionContainer>

      {/* ── 4. POWERED BY ─────────────────────────────────────── */}
      <SectionContainer bg="secondary">
        <div className="text-center mb-8">
          <p className="text-xs font-bold text-accent uppercase tracking-widest" style={{ fontFamily: 'var(--font-body)' }}>
            POWERED BY INDUSTRY-LEADING SECURITY ENGINES
          </p>
        </div>

        <div
          className="mx-auto max-w-5xl rounded-2xl bg-white p-8 flex flex-col gap-6"
          style={{ border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-card)' }}
        >
          {/* Row 1: 6 items */}
          <div className="grid grid-cols-3 md:grid-cols-6 gap-6 items-center justify-items-center">
            {enginesList.slice(0, 6).map((e) => (
              <div key={e.name} className="flex items-center gap-2 text-text-muted hover:text-text-secondary transition-colors cursor-pointer">
                {e.icon}
                <span className="text-sm font-semibold tracking-tight" style={{ fontFamily: 'var(--font-body)' }}>{e.name}</span>
              </div>
            ))}
          </div>
          {/* Row 2: 7 items */}
          <div className="grid grid-cols-3 md:grid-cols-7 gap-6 items-center justify-items-center">
            {enginesList.slice(6).map((e) => (
              <div key={e.name} className="flex items-center gap-2 text-text-muted hover:text-text-secondary transition-colors cursor-pointer">
                {e.icon}
                <span className="text-sm font-semibold tracking-tight" style={{ fontFamily: 'var(--font-body)' }}>{e.name}</span>
              </div>
            ))}
          </div>
        </div>
      </SectionContainer>

      {/* ── 5. EXECUTIVE REPORT & WHY CIPHERLENS ─────────────── */}
      <SectionContainer bg="primary">
        <div className="grid lg:grid-cols-12 gap-8">
          {/* Left: Report Card (7 columns) */}
          <div className="lg:col-span-7 card bg-white p-6 flex flex-col gap-6">
            {/* Header */}
            <div className="border-b pb-4 flex justify-between items-center" style={{ borderColor: 'var(--color-border)' }}>
              <p className="text-xs font-bold text-text-muted uppercase tracking-wider" style={{ fontFamily: 'var(--font-body)' }}>EXECUTIVE REPORT PREVIEW</p>
              <span className="badge badge-success text-[10px]">Active Report</span>
            </div>

            <div className="grid grid-cols-12 gap-5">
              {/* Left Column: Risk Dial + Surface */}
              <div className="col-span-12 md:col-span-4 space-y-4">
                <div className="rounded-xl p-3 text-center border" style={{ borderColor: 'var(--color-border)', background: 'var(--color-bg-primary)' }}>
                  <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider mb-2" style={{ fontFamily: 'var(--font-body)' }}>Business Risk Score</p>
                  <div className="relative w-16 h-16 mx-auto">
                    <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                      <circle cx="18" cy="18" r="15.9155" fill="none" stroke="#E5E3DE" strokeWidth="4" />
                      <circle cx="18" cy="18" r="15.9155" fill="none" stroke="var(--color-danger)" strokeWidth="4" strokeDasharray="82 18" strokeDashoffset="0" />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-lg font-bold" style={{ fontFamily: 'var(--font-body)', color: 'var(--color-text-primary)' }}>82</span>
                      <span className="text-[8px] font-medium text-red-600" style={{ fontFamily: 'var(--font-body)' }}>High Risk</span>
                    </div>
                  </div>
                </div>

                <div className="rounded-xl p-3 border space-y-3" style={{ borderColor: 'var(--color-border)', background: 'var(--color-bg-primary)' }}>
                  <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider text-center" style={{ fontFamily: 'var(--font-body)' }}>Attack Surface</p>
                  <div className="grid grid-cols-3 gap-y-2 gap-x-1 text-center">
                    {[
                      { val: '2', label: 'Web Assets' },
                      { val: '4', label: 'Repositories' },
                      { val: '23', label: 'Open Ports' },
                      { val: '312', label: 'Dependencies' },
                      { val: '1.2k', label: 'Secrets Scanned' },
                      { val: '89', label: 'Evidence Items' },
                    ].map((stat, idx) => (
                      <div key={idx} className="space-y-0.5">
                        <p className="text-xs font-bold text-text-primary" style={{ fontFamily: 'var(--font-body)' }}>{stat.val}</p>
                        <p className="text-[7px] text-text-muted uppercase tracking-tight leading-none" style={{ fontFamily: 'var(--font-body)' }}>{stat.label}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right Column: Findings list */}
              <div className="col-span-12 md:col-span-8 flex flex-col justify-between">
                <div className="space-y-2">
                  <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider" style={{ fontFamily: 'var(--font-body)' }}>Top Findings</p>
                  <div className="space-y-1.5">
                    {executiveFindings.map((f, idx) => (
                      <div key={idx} className="flex items-center justify-between p-2 rounded-lg bg-bg-primary border border-border-warm">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${idx === 0 ? 'bg-red-600' : idx < 3 ? 'bg-amber-500' : 'bg-blue-500'}`} />
                          <span className="text-[10px] text-text-secondary truncate" style={{ fontFamily: 'var(--font-body)' }}>{f.label}</span>
                        </div>
                        <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded flex-shrink-0 ${f.color}`} style={{ fontFamily: 'var(--font-body)' }}>{f.sev}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <a href="#report" className="text-xs font-bold text-accent hover:text-accent-dark transition-colors mt-4 block" style={{ fontFamily: 'var(--font-body)' }}>
                  View full report →
                </a>
              </div>
            </div>

            <div className="grid grid-cols-12 gap-5 border-t pt-4" style={{ borderColor: 'var(--color-border)' }}>
              {/* Risk over time visual graph */}
              <div className="col-span-12 md:col-span-6 space-y-1.5">
                <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider" style={{ fontFamily: 'var(--font-body)' }}>Risk Over Time (90 days)</p>
                <div className="h-16 w-full flex items-end relative pt-2">
                  {/* Graph Line */}
                  <svg viewBox="0 0 160 50" className="w-full h-full overflow-visible">
                    <polyline
                      fill="none"
                      stroke="var(--color-accent)"
                      strokeWidth="1.5"
                      points="0,32 30,34 60,18 90,16 120,22 150,8"
                    />
                    {/* Circle indicators */}
                    <circle cx="150" cy="8" r="2.5" fill="var(--color-accent)" />
                  </svg>
                  {/* Date labels */}
                  <div className="absolute bottom-0 left-0 right-0 flex justify-between text-[8px] text-text-muted" style={{ fontFamily: 'var(--font-body)' }}>
                    <span>Apr 6</span>
                    <span>Apr 27</span>
                    <span>May 18</span>
                    <span>Jun 8</span>
                    <span>Jul 5</span>
                  </div>
                </div>
              </div>

              {/* Compliance Gauges */}
              <div className="col-span-12 md:col-span-6 space-y-1.5">
                <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider text-center" style={{ fontFamily: 'var(--font-body)' }}>Compliance Overview</p>
                <div className="grid grid-cols-3 gap-2 justify-items-center pt-2">
                  {[
                    { label: 'OWASP Top 10', pct: 87 },
                    { label: 'CWE/SANS 25', pct: 91 },
                    { label: 'PCI DSS', pct: 74 },
                  ].map((c, idx) => (
                    <div key={idx} className="text-center">
                      <div className="relative w-10 h-10 mb-1">
                        <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                          <circle cx="18" cy="18" r="14.5" fill="none" stroke="#E5E3DE" strokeWidth="3" />
                          <circle cx="18" cy="18" r="14.5" fill="none" stroke="var(--color-success)" strokeWidth="3" strokeDasharray={`${c.pct * 0.91} 91`} />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-[8px] font-bold" style={{ fontFamily: 'var(--font-body)', color: 'var(--color-text-primary)' }}>{c.pct}%</span>
                        </div>
                      </div>
                      <p className="text-[8px] text-text-muted font-medium whitespace-nowrap" style={{ fontFamily: 'var(--font-body)' }}>{c.label}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Right: Why CipherLens comparison (5 columns) */}
          <div
            className="lg:col-span-5 card bg-white p-6 flex flex-col gap-6"
            style={{ border: '1.5px solid var(--color-accent-light)' }}
          >
            <div className="border-b pb-4" style={{ borderColor: 'var(--color-border)' }}>
              <p className="text-xs font-bold text-accent uppercase tracking-wider" style={{ fontFamily: 'var(--font-body)' }}>WHY CIPHERLENS</p>
              <h3 className="text-card-title text-xl font-bold mt-1">Beyond Traditional Scanners</h3>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Traditional */}
              <div className="space-y-4">
                <p className="text-xs font-bold text-text-muted uppercase tracking-wider" style={{ fontFamily: 'var(--font-body)' }}>Traditional Scanners</p>
                <ul className="space-y-3.5">
                  {traditionalPoints.map((item, i) => (
                    <li key={i} className="flex items-center gap-2">
                      <CrossIcon />
                      <span className="text-xs text-text-muted font-medium" style={{ fontFamily: 'var(--font-body)' }}>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* CipherLens */}
              <div className="space-y-4 border-l pl-4" style={{ borderColor: 'var(--color-border)' }}>
                <p className="text-xs font-bold text-accent uppercase tracking-wider" style={{ fontFamily: 'var(--font-body)' }}>CipherLens Platform</p>
                <ul className="space-y-3.5">
                  {cipherLensAdvantages.map((item, i) => (
                    <li key={i} className="flex items-center gap-2">
                      <CheckIcon />
                      <span className="text-xs text-text-secondary font-bold" style={{ fontFamily: 'var(--font-body)' }}>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </SectionContainer>

      {/* ── 6. COMING SOON SECTION ──────────────────────────── */}
      <SectionContainer bg="secondary">
        <div className="text-center mb-8">
          <p className="text-xs font-bold text-text-muted uppercase tracking-widest" style={{ fontFamily: 'var(--font-body)' }}>COMING SOON</p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
          {roadmapItems.map((item, idx) => (
            <div
              key={idx}
              className="card bg-white p-4 flex flex-col items-center justify-between text-center gap-3 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md"
            >
              <span className="text-2xl">{item.icon}</span>
              <div>
                <p className="text-xs font-bold text-text-primary" style={{ fontFamily: 'var(--font-body)' }}>{item.label}</p>
                <p className="text-[9px] text-text-muted font-medium mt-0.5" style={{ fontFamily: 'var(--font-body)' }}>{item.eta}</p>
              </div>
            </div>
          ))}
        </div>
      </SectionContainer>

      {/* ── 7. CTA SECTION ───────────────────────────────────── */}
      <section
        className="section-padding-sm relative overflow-hidden"
        style={{ background: 'var(--color-bg-secondary)', borderTop: '1px solid var(--color-border)', borderBottom: '1px solid var(--color-border)' }}
      >
        {/* Shield graphic watermark on the right */}
        <div className="absolute right-12 bottom-0 opacity-[0.04] pointer-events-none">
          <svg width="280" height="280" viewBox="0 0 24 24" fill="var(--color-accent)">
            <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z" />
          </svg>
        </div>

        <div className="container-main relative">
          <div className="text-center max-w-2xl mx-auto">
            <h2 className="text-section-title text-3xl font-medium mb-3">
              Ready to audit your technology assets?
            </h2>
            <p className="text-body mb-8">
              Start your first scan in minutes. No credit card required.
            </p>
            <div className="flex flex-wrap gap-3 justify-center">
              <Button variant="primary" size="lg" href="/signup">
                Start Free Scan →
              </Button>
              <Button variant="secondary" size="lg" href="#sales">
                Talk to Sales
              </Button>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
