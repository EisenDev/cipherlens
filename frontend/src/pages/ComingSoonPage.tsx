import { useState } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import DashboardLayout from '../components/DashboardLayout';
import { type LucideIcon } from 'lucide-react';

interface FeatureItem {
  title: string;
  description: string;
  icon: LucideIcon;
  colorClass: string;
  iconColor: string;
}

interface ComingSoonPageProps {
  pageId: 'integrations' | 'api-keys' | 'organizations' | 'billing' | 'team' | 'support';
  pageName: string;
  breadcrumb: string;
  headlineAccent: string;
  description: string;
  features: FeatureItem[];
}

export default function ComingSoonPage({
  pageId,
  pageName,
  breadcrumb,
  headlineAccent,
  description,
  features
}: ComingSoonPageProps) {
  const { accessToken } = useAuthStore();
  const [notified, setNotified] = useState<boolean>(false);

  const handleNotify = () => {
    setNotified(true);
  };

  if (!accessToken) return null;

  // Custom SVG outline illustration matching landing page brand aesthetic
  const renderIllustration = () => {
    switch (pageId) {
      case 'integrations':
        return (
          <svg className="w-24 h-24 text-[var(--color-accent)] drop-shadow-sm relative z-10" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M50 15C65 15 80 20 80 20C80 20 80 45 80 58C80 75 50 85 50 85C50 85 20 75 20 58C20 45 20 20 20 20C20 20 35 15 50 15Z" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="var(--color-bg-secondary)"/>
            <path d="M42 43a8 8 0 1016 0 8 8 0 00-16 0z" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M50 31v4M50 51v4M38 43h4M58 43h4" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
            <circle cx="50" cy="43" r="2" fill="#FFF"/>
            <path d="M35 65h30" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
            <circle cx="35" cy="65" r="3" fill="currentColor"/>
            <circle cx="65" cy="65" r="3" fill="currentColor"/>
          </svg>
        );
      case 'api-keys':
        return (
          <svg className="w-24 h-24 text-[var(--color-accent)] drop-shadow-sm relative z-10" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M50 15C65 15 80 20 80 20C80 20 80 45 80 58C80 75 50 85 50 85C50 85 20 75 20 58C20 45 20 20 20 20C20 20 35 15 50 15Z" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="var(--color-bg-secondary)"/>
            <circle cx="43" cy="43" r="9" stroke="currentColor" strokeWidth="2.5" fill="none"/>
            <path d="M49 49 L66 66 M58 58 L63 53 M63 63 L68 58" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            <circle cx="43" cy="43" r="2.5" fill="#FFF"/>
          </svg>
        );
      case 'organizations':
        return (
          <svg className="w-24 h-24 text-[var(--color-accent)] drop-shadow-sm relative z-10" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M50 15C65 15 80 20 80 20C80 20 80 45 80 58C80 75 50 85 50 85C50 85 20 75 20 58C20 45 20 20 20 20C20 20 35 15 50 15Z" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="var(--color-bg-secondary)"/>
            <circle cx="50" cy="38" r="6" stroke="currentColor" strokeWidth="2.5" fill="none"/>
            <circle cx="34" cy="58" r="6" stroke="currentColor" strokeWidth="2.5" fill="none"/>
            <circle cx="66" cy="58" r="6" stroke="currentColor" strokeWidth="2.5" fill="none"/>
            <path d="M45 42 L39 53 M55 42 L61 53 M40 58 H60" stroke="currentColor" strokeWidth="2" strokeDasharray="3 3"/>
          </svg>
        );
      case 'billing':
        return (
          <svg className="w-24 h-24 text-[var(--color-accent)] drop-shadow-sm relative z-10" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M50 15C65 15 80 20 80 20C80 20 80 45 80 58C80 75 50 85 50 85C50 85 20 75 20 58C20 45 20 20 20 20C20 20 35 15 50 15Z" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="var(--color-bg-secondary)"/>
            <rect x="30" y="38" width="40" height="26" rx="3" stroke="currentColor" strokeWidth="2.5" fill="none"/>
            <path d="M30 45 H70" stroke="currentColor" strokeWidth="2.5"/>
            <rect x="36" y="51" width="8" height="5" rx="1" fill="currentColor"/>
          </svg>
        );
      case 'team':
        return (
          <svg className="w-24 h-24 text-[var(--color-accent)] drop-shadow-sm relative z-10" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M50 15C65 15 80 20 80 20C80 20 80 45 80 58C80 75 50 85 50 85C50 85 20 75 20 58C20 45 20 20 20 20C20 20 35 15 50 15Z" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="var(--color-bg-secondary)"/>
            {/* Center Leader Circle */}
            <circle cx="50" cy="38" r="5" stroke="currentColor" strokeWidth="2.5" fill="none"/>
            <path d="M41 49c0-3.5 4.5-5 9-5s9 1.5 9 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            
            {/* Left Member Circle */}
            <circle cx="34" cy="54" r="4.5" stroke="currentColor" strokeWidth="2.5" fill="none"/>
            <path d="M26 63c0-3 3.5-4 8-4s8 1 8 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            
            {/* Right Member Circle */}
            <circle cx="66" cy="54" r="4.5" stroke="currentColor" strokeWidth="2.5" fill="none"/>
            <path d="M58 63c0-3 3.5-4 8-4s8 1 8 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        );
      case 'support':
        return (
          <svg className="w-24 h-24 text-[var(--color-accent)] drop-shadow-sm relative z-10" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M50 15C65 15 80 20 80 20C80 20 80 45 80 58C80 75 50 85 50 85C50 85 20 75 20 58C20 45 20 20 20 20C20 20 35 15 50 15Z" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="var(--color-bg-secondary)"/>
            <path d="M36 55 A14 14 0 0 1 64 55" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
            <rect x="31" y="50" width="5" height="9" rx="2" stroke="currentColor" strokeWidth="2.5" fill="none"/>
            <rect x="64" y="50" width="5" height="9" rx="2" stroke="currentColor" strokeWidth="2.5" fill="none"/>
            <path d="M64 56 L55 62" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"/>
            <circle cx="53" cy="63" r="2.2" fill="currentColor"/>
          </svg>
        );
      default:
        return null;
    }
  };

  return (
    <DashboardLayout activePage={pageId}>
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
          <span>{breadcrumb}</span>
        </div>

        {/* Central Card Container */}
        <div className="max-w-4xl w-full mx-auto flex flex-col justify-center items-center mt-6">
          
          {/* SVG Illustration */}
          <div className="relative w-32 h-32 flex items-center justify-center mx-auto mb-5">
            {/* Pulsing Background Glow */}
            <div className="absolute inset-0 bg-[var(--color-accent-subtle)] rounded-full blur-xl opacity-60 animate-pulse" />
            
            {renderIllustration()}

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
            {pageName} is<br />
            <span className="text-[var(--color-accent)]">{headlineAccent}</span>
          </h1>
          
          <p className="text-text-secondary max-w-lg mx-auto text-xs font-semibold mt-4 leading-relaxed">
            {description}
          </p>

          {/* What's Coming Grid */}
          <div className="mt-14 w-full">
            <h2 className="text-xs font-bold text-text-primary uppercase tracking-widest mb-6 select-none">
              What's Coming?
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 w-full text-left">
              
              {features.map((feature, i) => {
                const IconComponent = feature.icon;
                return (
                  <div key={i} className="flex flex-col items-center text-center p-5 bg-bg-card/70 backdrop-blur-sm border border-border-warm rounded-2xl shadow-sm hover:shadow-md transition-all">
                    <div className={`w-10 h-10 rounded-full ${feature.colorClass} flex items-center justify-center mb-3.5`}>
                      <IconComponent className={`w-5 h-5 ${feature.iconColor}`} />
                    </div>
                    <h3 className="text-xs font-bold text-text-primary mb-1.5">{feature.title}</h3>
                    <p className="text-[10px] text-text-muted font-bold leading-relaxed">
                      {feature.description}
                    </p>
                  </div>
                );
              })}
              
            </div>
          </div>

          {/* Notify Me Notification Banner */}
          <div className="mt-12 w-full max-w-xl">
            <div className="bg-bg-card border border-border-warm rounded-2xl p-4 flex items-center justify-between gap-4 shadow-sm">
              <div className="flex items-center gap-3.5 text-left">
                <div className="w-10 h-10 rounded-xl bg-[var(--color-accent-subtle)] flex items-center justify-center flex-shrink-0 border border-[var(--color-accent-light)]/20 shadow-inner">
                  <svg className="w-5 h-5 text-[var(--color-accent)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                  </svg>
                </div>
                <div className="leading-snug">
                  <h4 className="text-xs font-bold text-text-primary">Want to be notified when it's ready?</h4>
                  <p className="text-[10px] text-text-muted font-bold mt-0.5">We'll let you know as soon as the {breadcrumb} page is available.</p>
                </div>
              </div>
              
              <button 
                onClick={handleNotify} 
                disabled={notified}
                className={`px-5 py-2.5 text-xs font-bold rounded-xl transition-all shadow-sm focus:outline-none flex-shrink-0 border select-none ${
                  notified 
                    ? 'bg-bg-muted text-text-muted border-border-warm cursor-default' 
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
