import { useState } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import DashboardLayout from '../components/DashboardLayout';
import { Shield, Layers, FileText } from 'lucide-react';

export default function CompliancePage() {
  const { accessToken } = useAuthStore();
  const [notified, setNotified] = useState<boolean>(false);


  const handleNotify = () => {
    setNotified(true);
  };

  if (!accessToken) return null;

  return (
    <DashboardLayout activePage="compliance">
      <div 
        className="py-8 px-10 min-h-[calc(100vh-64px)] flex flex-col justify-center items-center text-center bg-bg-secondary relative overflow-hidden w-full"
        style={{
          backgroundImage: 'radial-gradient(var(--color-border) 1.2px, transparent 1.2px)',
          backgroundSize: '24px 24px'
        }}
      >
        {/* Page Header (Top Left Breadcrumb Indicator) */}
        <div className="absolute top-8 left-10 flex items-center gap-1.5 text-xs text-text-muted font-bold select-none">
          <span>&gt;</span>
          <span>Compliance</span>
        </div>

        {/* Central Card Container */}
        <div className="max-w-4xl w-full mx-auto flex flex-col justify-center items-center mt-6">
          
          {/* Padlock Illustration */}
          <div className="relative w-32 h-32 flex items-center justify-center mx-auto mb-5">
            {/* Pulsing Background Glow */}
            <div className="absolute inset-0 bg-[var(--color-accent-subtle)] rounded-full blur-xl opacity-60 animate-pulse" />
            
            {/* Custom SVG Padlock & Shield line art */}
            <svg 
              className="w-24 h-24 text-[var(--color-accent)] drop-shadow-sm relative z-10" 
              viewBox="0 0 100 100" 
              fill="none" 
              xmlns="http://www.w3.org/2000/svg"
            >
              {/* Shield Outline */}
              <path 
                d="M50 15C65 15 80 20 80 20C80 20 80 45 80 58C80 75 50 85 50 85C50 85 20 75 20 58C20 45 20 20 20 20C20 20 35 15 50 15Z" 
                stroke="currentColor" 
                strokeWidth="2.5" 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                fill="var(--color-bg-secondary)"
              />
              {/* Padlock Shackle */}
              <path 
                d="M38 48V42C38 35.3726 43.3726 30 50 30C56.6274 30 62 35.3726 62 42V48" 
                stroke="currentColor" 
                strokeWidth="2.5" 
                strokeLinecap="round"
              />
              {/* Padlock Body */}
              <rect 
                x="33" 
                y="48" 
                width="34" 
                height="22" 
                rx="4" 
                fill="currentColor" 
                stroke="currentColor" 
                strokeWidth="2.5"
              />
              {/* Keyhole Pin */}
              <circle cx="50" cy="57" r="2.5" fill="#FFF"/>
              <path d="M50 59.5V64" stroke="#FFF" strokeWidth="2" strokeLinecap="round"/>
            </svg>

            {/* Sparkles */}
            <div className="absolute top-2 left-1 text-[var(--color-accent)] text-sm animate-bounce select-none">✦</div>
            <div className="absolute bottom-5 right-2 text-[var(--color-accent-light)] text-sm animate-ping select-none">✦</div>
          </div>

          {/* Coming Soon Pill Badge */}
          <span className="inline-block bg-[var(--color-accent-subtle)] text-[var(--color-accent-dark)] border border-[var(--color-accent-light)]/40 text-[9px] font-extrabold px-3 py-1 rounded-full uppercase tracking-widest mb-4 select-none">
            Coming Soon
          </span>

          {/* Headings */}
          <h1 className="text-3xl lg:text-4xl font-extrabold text-text-primary tracking-tight leading-tight select-none">
            Compliance Page is<br />
            <span className="text-[var(--color-accent)]">Not Yet Ready</span>
          </h1>
          
          <p className="text-text-muted max-w-lg mx-auto text-xs font-semibold mt-4 leading-relaxed">
            We're building a powerful compliance center to help you<br />
            map findings to industry standards and track your<br />
            compliance posture with confidence.
          </p>

          {/* What's Coming Grid */}
          <div className="mt-14 w-full">
            <h2 className="text-xs font-bold text-text-primary uppercase tracking-widest mb-6 select-none">
              What's Coming?
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 w-full text-left">
              
              {/* 1. Framework Mapping */}
              <div className="flex flex-col items-center text-center p-5 bg-bg-card/70 backdrop-blur-sm border border-border-warm rounded-2xl shadow-sm hover:shadow-md transition-all">
                <div className="w-10 h-10 rounded-full bg-purple-50 flex items-center justify-center mb-3.5">
                  <FileText className="w-5 h-5 text-purple-500" />
                </div>
                <h3 className="text-xs font-bold text-text-primary mb-1.5">Framework Mapping</h3>
                <p className="text-[10px] text-text-muted font-bold leading-relaxed">
                  Map findings to frameworks like OWASP, PCI DSS, NIST, ISO 27001, and more.
                </p>
              </div>

              {/* 2. Compliance Tracking */}
              <div className="flex flex-col items-center text-center p-5 bg-bg-card/70 backdrop-blur-sm border border-border-warm rounded-2xl shadow-sm hover:shadow-md transition-all">
                <div className="w-10 h-10 rounded-full bg-success-bg flex items-center justify-center mb-3.5">
                  <Layers className="w-5 h-5 text-emerald-500" />
                </div>
                <h3 className="text-xs font-bold text-text-primary mb-1.5">Compliance Tracking</h3>
                <p className="text-[10px] text-text-muted font-bold leading-relaxed">
                  Track your compliance status and identify gaps in real-time.
                </p>
              </div>

              {/* 3. Evidence Management */}
              <div className="flex flex-col items-center text-center p-5 bg-bg-card/70 backdrop-blur-sm border border-border-warm rounded-2xl shadow-sm hover:shadow-md transition-all">
                <div className="w-10 h-10 rounded-full bg-warning-bg flex items-center justify-center mb-3.5">
                  <Shield className="w-5 h-5 text-warning" />
                </div>
                <h3 className="text-xs font-bold text-text-primary mb-1.5">Evidence Management</h3>
                <p className="text-[10px] text-text-muted font-bold leading-relaxed">
                  Collect and manage evidence to support audits and assessments.
                </p>
              </div>

              {/* 4. Custom Reports */}
              <div className="flex flex-col items-center text-center p-5 bg-bg-card/70 backdrop-blur-sm border border-border-warm rounded-2xl shadow-sm hover:shadow-md transition-all">
                <div className="w-10 h-10 rounded-full bg-info-bg flex items-center justify-center mb-3.5">
                  <FileText className="w-5 h-5 text-info" />
                </div>
                <h3 className="text-xs font-bold text-text-primary mb-1.5">Custom Reports</h3>
                <p className="text-[10px] text-text-muted font-bold leading-relaxed">
                  Generate compliance reports tailored for your organization and auditors.
                </p>
              </div>
              
            </div>
          </div>

          {/* Notify Me Notification Banner */}
          <div className="mt-12 w-full max-w-xl">
            <div className="bg-bg-primary border border-border rounded-2xl p-4 flex items-center justify-between gap-4 shadow-sm">
              <div className="flex items-center gap-3.5 text-left">
                <div className="w-10 h-10 rounded-xl bg-[var(--color-accent-subtle)] flex items-center justify-center flex-shrink-0 border border-[var(--color-accent-light)]/20 shadow-inner">
                  <svg className="w-5 h-5 text-[var(--color-accent)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                  </svg>
                </div>
                <div className="leading-snug">
                  <h4 className="text-xs font-bold text-text-primary">Want to be notified when it's ready?</h4>
                  <p className="text-[10px] text-text-muted font-bold mt-0.5">We'll let you know as soon as the Compliance page is available.</p>
                </div>
              </div>
              
              <button 
                onClick={handleNotify} 
                disabled={notified}
                className={`px-5 py-2.5 text-xs font-bold rounded-xl transition-all shadow-sm focus:outline-none flex-shrink-0 border select-none ${
                  notified 
                    ? 'bg-bg-muted text-text-muted border-border cursor-default' 
                    : 'bg-[var(--color-accent)] text-white border-[var(--color-accent)] hover:bg-[var(--color-accent-dark)] hover:border-[var(--color-accent-dark)] active:scale-95'
                }`}
              >
                {notified ? 'Notified! ✓' : 'Notify Me'}
              </button>
            </div>
          </div>

        </div>
      </div>
    </DashboardLayout>
  );
}
