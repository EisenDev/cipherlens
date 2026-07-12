import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useUIStore } from '../store/useUIStore';
import { Badge } from '../components/ui';
import { useAuthStore } from '../store/useAuthStore';
import logoImg from '../assets/logo.png';

export default function SignupPage() {
  const { accessToken } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (accessToken) {
      navigate('/overview');
    }
  }, [accessToken, navigate]);
  const { openLoginModal } = useUIStore();

  // Form State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [company, setCompany] = useState('');
  const [teamSize, setTeamSize] = useState('');
  const [role, setRole] = useState('');
  const [agree, setAgree] = useState(false);

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agree) {
      setErrorMessage('You must agree to the Terms of Service and Privacy Policy.');
      return;
    }

    setStatus('loading');
    setErrorMessage(null);
    setFieldErrors({});
    try {
      const envUrl = import.meta.env.VITE_API_URL;
      const apiUrl = typeof envUrl === 'string' ? envUrl : 'http://localhost:3005';
      const response = await fetch(`${apiUrl}/api/auth/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fullName: name,
          email,
          password,
          confirmPassword,
          companyName: company || null,
          teamSize: teamSize || null,
          role: role || null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.errors && Array.isArray(data.errors)) {
          const errorsObj: Record<string, string> = {};
          data.errors.forEach((err: any) => {
            errorsObj[err.field] = err.message;
          });
          setFieldErrors(errorsObj);
          throw new Error('Validation failed. Please correct the fields marked in red.');
        } else {
          throw new Error(data.message || 'Failed to create account.');
        }
      }

      setStatus('success');
    } catch (err: any) {
      setStatus('error');
      setErrorMessage(err.message || 'An unexpected error occurred. Please try again.');
    }
  };

  // Micro-interactive password strength meter
  const getPasswordStrength = () => {
    if (!password) return { label: 'Weak', color: 'bg-border-warm', textClass: 'text-text-muted', percent: 'w-0' };
    if (password.length < 6) return { label: 'Weak', color: 'bg-danger-bg0', textClass: 'text-danger', percent: 'w-1/3' };
    if (password.length < 10) return { label: 'Medium', color: 'bg-warning-bg0', textClass: 'text-warning', percent: 'w-2/3' };
    return { label: 'Strong', color: 'bg-emerald-600', textClass: 'text-success', percent: 'w-full' };
  };

  const strength = getPasswordStrength();

  return (
    <div className="min-h-screen bg-bg-primary text-text-primary flex flex-col">
      {/* Header Row */}
      <header
        className="w-full border-b border-border-warm bg-bg-primary sticky top-0 z-40"
        style={{
          backgroundColor: 'rgba(250, 250, 247, 0.92)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
        }}
      >
        <div className="container-main flex items-center justify-between h-14">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 flex-shrink-0 group">
            <img src={logoImg} alt="CipherLens" className="w-8 h-8 object-contain transition-transform group-hover:scale-105" />
            <div className="flex flex-col leading-none">
              <span
                className="text-lg font-bold tracking-wide font-serif relative"
                style={{ 
                  color: 'var(--color-text-primary)',
                  textShadow: '0 2px 4px rgba(0,0,0,0.15)'
                }}
              >
                Cipher<span style={{ color: 'var(--color-accent)' }}>lens</span>
              </span>
              <div className="flex justify-center -mt-1.5">
                <span className="text-[10px]" style={{ color: 'var(--color-accent)' }}>✦</span>
              </div>
            </div>
          </Link>

          {/* Log in CTA */}
          <div className="flex items-center gap-4">
            <span className="text-xs text-text-secondary hidden sm:inline" style={{ fontFamily: 'var(--font-body)' }}>
              Already have an account?
            </span>
            <button
              onClick={openLoginModal}
              className="px-3.5 py-1.5 rounded-lg border border-border-strong text-xs font-bold hover:bg-bg-secondary transition-colors cursor-pointer focus:outline-none"
              style={{ fontFamily: 'var(--font-body)', color: 'var(--color-text-primary)' }}
            >
              Log in
            </button>
          </div>
        </div>
      </header>

      {/* Main Body Split Panel */}
      <main className="flex-1 container-main py-10">
        <div className="grid lg:grid-cols-12 gap-12 items-start">
          {/* Left Column: Product Value Propositions */}
          <div className="lg:col-span-6 space-y-8 lg:sticky lg:top-24 self-start">
            <div className="space-y-4">
              <Badge variant="accent" icon={
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                </svg>
              }>
                AI SECURITY INTELLIGENCE PLATFORM
              </Badge>

              <h1 className="text-section-title text-4xl lg:text-5xl font-light leading-tight">
                Create your<br />
                <span className="text-accent font-medium">CipherLens</span> account
              </h1>
              <p className="text-body text-base max-w-md">
                Start scanning, analyzing, and protecting your digital assets in minutes. No credit card required.
              </p>
            </div>

            {/* Core Propositions List */}
            <div className="space-y-5">
              {[
                {
                  title: '12+ Industry-Leading Engines',
                  desc: 'Powered by the best security tools trusted by enterprise security teams.',
                  icon: (
                    <svg className="w-5 h-5 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                    </svg>
                  ),
                },
                {
                  title: 'AI-Powered Intelligence',
                  desc: 'Correlate findings, get risk scores, and receive actionable remediation guidance.',
                  icon: (
                    <svg className="w-5 h-5 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                    </svg>
                  ),
                },
                {
                  title: 'Executive-Grade Reports',
                  desc: 'Beautiful reports with business impact, evidence, and remediation steps.',
                  icon: (
                    <svg className="w-5 h-5 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6M7 4H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V8l-5-4H7z" />
                    </svg>
                  ),
                },
                {
                  title: 'Built for Modern Teams',
                  desc: 'Invite your team, manage permissions, and scale with confidence.',
                  icon: (
                    <svg className="w-5 h-5 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.97 5.97 0 00-.75-2.985m-.94 3.198A5.97 5.97 0 0015 16c0-.98-.363-1.875-1.02-2.583a3 3 0 00-4.68 0A5.962 5.962 0 006.75 16c0 .769.145 1.498.41 2.185m10.84-2.185a11.954 11.954 0 00-3.742-1.748M12 12a3 3 0 100-6 3 3 0 000 6z" />
                    </svg>
                  ),
                },
              ].map((item, idx) => (
                <div key={idx} className="flex gap-4 items-start">
                  <div className="w-10 h-10 rounded-xl bg-accent-subtle border border-accent-light flex items-center justify-center flex-shrink-0">
                    {item.icon}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-text-primary mb-0.5" style={{ fontFamily: 'var(--font-body)' }}>{item.title}</h3>
                    <p className="text-xs text-text-muted leading-relaxed" style={{ fontFamily: 'var(--font-body)' }}>{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Dashboard Mini Mockup */}
            <div className="hidden lg:block pt-4">
              <div
                className="rounded-2xl border border-border-warm bg-bg-primary p-5 shadow-panel opacity-90 relative overflow-hidden"
                style={{ transform: 'scale(0.9)', transformOrigin: 'left top' }}
              >
                <div className="flex items-center justify-between pb-3 border-b mb-3" style={{ borderColor: 'var(--color-border)' }}>
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-success-bg0" />
                    <span className="text-[10px] font-bold text-text-secondary uppercase tracking-wider" style={{ fontFamily: 'var(--font-body)' }}>Overall Security Score</span>
                  </div>
                  <span className="text-xs font-bold text-success" style={{ fontFamily: 'var(--font-body)' }}>82 / 100</span>
                </div>
                <div className="flex items-center gap-4">
                  <div className="relative w-12 h-12 flex-shrink-0">
                    <svg viewBox="0 0 36 36" className="w-12 h-12 -rotate-90">
                      <circle cx="18" cy="18" r="15.9155" fill="none" stroke="#E5E3DE" strokeWidth="4.5" />
                      <circle cx="18" cy="18" r="15.9155" fill="none" stroke="var(--color-success)" strokeWidth="4.5" strokeDasharray="82 18" />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center text-[9px] font-bold" style={{ color: 'var(--color-text-primary)' }}>
                      82%
                    </div>
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center justify-between text-[9px] text-text-muted" style={{ fontFamily: 'var(--font-body)' }}>
                      <span>github.com/acme/backend</span>
                      <span className="text-success font-semibold">Completed</span>
                    </div>
                    <div className="flex items-center justify-between text-[9px] text-text-muted" style={{ fontFamily: 'var(--font-body)' }}>
                      <span>acme.com (Website Scan)</span>
                      <span className="text-success font-semibold">Completed</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Signup Form Card */}
          <div className="lg:col-span-6">
            {status === 'success' ? (
              <div
                className="card bg-bg-primary p-8 rounded-3xl text-center flex flex-col items-center justify-center py-16"
                style={{ border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-panel)' }}
              >
                {/* Gold Checkmark Circle */}
                <div className="w-16 h-16 rounded-full bg-warning-bg flex items-center justify-center border border-accent/20 mb-6">
                  <svg className="w-8 h-8 text-accent animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                
                <h2
                  className="text-3xl font-light text-text-primary mb-3"
                  style={{ fontFamily: 'var(--font-heading)' }}
                >
                  Account Created!
                </h2>
                
                <p
                  className="text-sm text-text-secondary leading-relaxed max-w-md mb-8"
                  style={{ fontFamily: 'var(--font-body)' }}
                >
                  Welcome to <span className="font-semibold text-accent">CipherLens</span>, <span className="font-semibold text-text-primary">{name}</span>. Your account (<span className="text-text-primary font-semibold">{email}</span>) has been registered successfully.
                </p>

                <div className="bg-bg-secondary border border-border-warm rounded-2xl p-4 mb-8 text-left w-full text-xs space-y-1.5" style={{ fontFamily: 'var(--font-body)' }}>
                  <div className="flex items-center gap-1.5 font-semibold text-text-primary">
                    <svg className="w-4 h-4 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                    Enterprise Security Profile Active
                  </div>
                  <p className="text-text-muted">
                    No further activation required. You can now use the global navigation bar to log into your security dashboard.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 w-full justify-center">
                  <button
                    onClick={openLoginModal}
                    className="btn btn-primary w-full sm:w-auto px-6 py-2.5 font-semibold cursor-pointer"
                    style={{ fontFamily: 'var(--font-body)' }}
                  >
                    Log In Now
                  </button>
                  <Link
                    to="/"
                    className="btn btn-secondary w-full sm:w-auto px-6 py-2.5 font-semibold text-center"
                    style={{ fontFamily: 'var(--font-body)' }}
                  >
                    Back to Home
                  </Link>
                </div>
              </div>
            ) : (
              <div
                className="card bg-bg-primary p-8 rounded-3xl"
                style={{ border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-panel)' }}
              >
                <div className="text-center mb-8">
                  <h2
                    className="text-3xl font-light text-text-primary mb-2"
                    style={{ fontFamily: 'var(--font-heading)' }}
                  >
                    Create your account
                  </h2>
                  <p
                    className="text-xs text-text-muted"
                    style={{ fontFamily: 'var(--font-body)' }}
                  >
                    Enter your details to get started.
                  </p>
                </div>

                {errorMessage && (
                  <div className="p-3.5 mb-5 rounded-xl border border-danger/30 bg-danger-bg text-xs text-danger flex items-start gap-2.5" style={{ fontFamily: 'var(--font-body)' }}>
                    <svg className="w-4 h-4 text-danger flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <span>{errorMessage}</span>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Full name */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-text-primary uppercase tracking-wider" style={{ fontFamily: 'var(--font-body)' }}>
                      Full name
                    </label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                        </svg>
                      </span>
                      <input
                        type="text"
                        required
                        placeholder="John Doe"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className={`w-full pl-10 pr-4 py-2.5 rounded-xl border ${fieldErrors.fullName ? 'border-red-400 focus:border-red-400' : 'border-border-warm focus:border-accent'} bg-bg-primary text-sm text-text-primary placeholder:text-text-muted focus:outline-none transition-colors`}
                        style={{ fontFamily: 'var(--font-body)' }}
                      />
                    </div>
                    {fieldErrors.fullName && (
                      <p className="text-[10px] text-danger font-semibold mt-1" style={{ fontFamily: 'var(--font-body)' }}>
                        {fieldErrors.fullName}
                      </p>
                    )}
                  </div>

                  {/* Work email */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-text-primary uppercase tracking-wider" style={{ fontFamily: 'var(--font-body)' }}>
                      Work email
                    </label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                        </svg>
                      </span>
                      <input
                        type="email"
                        required
                        placeholder="you@company.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className={`w-full pl-10 pr-4 py-2.5 rounded-xl border ${fieldErrors.email ? 'border-red-400 focus:border-red-400' : 'border-border-warm focus:border-accent'} bg-bg-primary text-sm text-text-primary placeholder:text-text-muted focus:outline-none transition-colors`}
                        style={{ fontFamily: 'var(--font-body)' }}
                      />
                    </div>
                    {fieldErrors.email && (
                      <p className="text-[10px] text-danger font-semibold mt-1" style={{ fontFamily: 'var(--font-body)' }}>
                        {fieldErrors.email}
                      </p>
                    )}
                  </div>

                  {/* Password */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-text-primary uppercase tracking-wider" style={{ fontFamily: 'var(--font-body)' }}>
                      Password
                    </label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                        </svg>
                      </span>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        placeholder="Create a strong password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className={`w-full pl-10 pr-10 py-2.5 rounded-xl border ${fieldErrors.password ? 'border-red-400 focus:border-red-400' : 'border-border-warm focus:border-accent'} bg-bg-primary text-sm text-text-primary placeholder:text-text-muted focus:outline-none transition-colors`}
                        style={{ fontFamily: 'var(--font-body)' }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary"
                      >
                        <span className="text-xs">👁️</span>
                      </button>
                    </div>
                    {fieldErrors.password && (
                      <p className="text-[10px] text-danger font-semibold mt-1" style={{ fontFamily: 'var(--font-body)' }}>
                        {fieldErrors.password}
                      </p>
                    )}

                    {/* Password strength segments row */}
                    <div className="space-y-1">
                      <div className="h-1.5 w-full bg-bg-secondary rounded-full overflow-hidden flex gap-0.5">
                        <div className={`h-full flex-1 ${password.length > 0 ? strength.color : 'bg-bg-secondary'}`} />
                        <div className={`h-full flex-1 ${password.length >= 6 ? strength.color : 'bg-bg-secondary'}`} />
                        <div className={`h-full flex-1 ${password.length >= 10 ? strength.color : 'bg-bg-secondary'}`} />
                      </div>
                      <div className="flex justify-between items-center text-[10px] font-semibold text-text-muted" style={{ fontFamily: 'var(--font-body)' }}>
                        <span>Password must be at least 8 characters</span>
                        <span className={strength.textClass}>{strength.label}</span>
                      </div>
                    </div>
                  </div>

                  {/* Confirm password */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-text-primary uppercase tracking-wider" style={{ fontFamily: 'var(--font-body)' }}>
                      Confirm password
                    </label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                        </svg>
                      </span>
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        required
                        placeholder="Confirm your password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className={`w-full pl-10 pr-10 py-2.5 rounded-xl border ${fieldErrors.confirmPassword ? 'border-red-400 focus:border-red-400' : 'border-border-warm focus:border-accent'} bg-bg-primary text-sm text-text-primary placeholder:text-text-muted focus:outline-none transition-colors`}
                        style={{ fontFamily: 'var(--font-body)' }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary"
                      >
                        <span className="text-xs">👁️</span>
                      </button>
                    </div>
                    {fieldErrors.confirmPassword && (
                      <p className="text-[10px] text-danger font-semibold mt-1" style={{ fontFamily: 'var(--font-body)' }}>
                        {fieldErrors.confirmPassword}
                      </p>
                    )}
                  </div>

                  {/* Company name (optional) */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-text-primary uppercase tracking-wider" style={{ fontFamily: 'var(--font-body)' }}>
                      Company name <span className="text-text-muted font-normal lowercase">(optional)</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 21v-8.25M15.75 21v-8.25M8.25 21v-8.25M3 9l9-6 9 6m-1.5 12V10.33L12 5.508 5.25 10.33V21h13.5z" />
                        </svg>
                      </span>
                      <input
                        type="text"
                        placeholder="Acme Corporation"
                        value={company}
                        onChange={(e) => setCompany(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border-warm bg-bg-primary text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent transition-colors"
                        style={{ fontFamily: 'var(--font-body)' }}
                      />
                    </div>
                  </div>

                  {/* Grid for dropdown fields */}
                  <div className="grid grid-cols-2 gap-4">
                    {/* Team Size */}
                    <div className="space-y-1.5">
                      <label className="block text-xs font-semibold text-text-primary uppercase tracking-wider" style={{ fontFamily: 'var(--font-body)' }}>
                        Team size <span className="text-text-muted font-normal lowercase">(optional)</span>
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none">
                          👥
                        </span>
                        <select
                          value={teamSize}
                          onChange={(e) => setTeamSize(e.target.value)}
                          className="w-full pl-9 pr-8 py-2.5 rounded-xl border border-border-warm bg-bg-primary text-xs text-text-primary focus:outline-none focus:border-accent appearance-none cursor-pointer"
                          style={{ fontFamily: 'var(--font-body)' }}
                        >
                          <option value="">Select team size</option>
                          <option value="1-5">1 - 5 members</option>
                          <option value="6-20">6 - 20 members</option>
                          <option value="21-99">21 - 99 members</option>
                          <option value="100+">100+ members</option>
                        </select>
                        <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-text-muted text-[10px]">
                          ▼
                        </div>
                      </div>
                    </div>

                    {/* Role describes you */}
                    <div className="space-y-1.5">
                      <label className="block text-xs font-semibold text-text-primary uppercase tracking-wider" style={{ fontFamily: 'var(--font-body)' }}>
                        What describes you?
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none">
                          💼
                        </span>
                        <select
                          required
                          value={role}
                          onChange={(e) => setRole(e.target.value)}
                          className="w-full pl-9 pr-8 py-2.5 rounded-xl border border-border-warm bg-bg-primary text-xs text-text-primary focus:outline-none focus:border-accent appearance-none cursor-pointer"
                          style={{ fontFamily: 'var(--font-body)' }}
                        >
                          <option value="">Select your role</option>
                          <option value="developer">Developer</option>
                          <option value="security">Security Engineer</option>
                          <option value="manager">Engineering Manager</option>
                          <option value="executive">Executive / C-Level</option>
                        </select>
                        <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-text-muted text-[10px]">
                          ▼
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Agreement checkbox */}
                  <div className="flex items-start gap-2.5 pt-1.5">
                    <input
                      type="checkbox"
                      id="agree"
                      required
                      checked={agree}
                      onChange={(e) => setAgree(e.target.checked)}
                      className="w-4 h-4 rounded border-border-warm text-accent focus:ring-accent bg-bg-primary accent-accent cursor-pointer mt-0.5"
                    />
                    <label htmlFor="agree" className="text-xs font-semibold text-text-secondary cursor-pointer select-none leading-relaxed" style={{ fontFamily: 'var(--font-body)' }}>
                      I agree to the{' '}
                      <a href="#terms" className="text-accent font-bold hover:underline">Terms of Service</a>
                      {' '}and{' '}
                      <a href="#privacy" className="text-accent font-bold hover:underline">Privacy Policy</a>
                    </label>
                  </div>

                  {/* Submit button */}
                  <button
                    type="submit"
                    disabled={status === 'loading'}
                    className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-white font-medium bg-accent hover:bg-accent-dark disabled:bg-accent/60 disabled:cursor-not-allowed transition-all duration-300 shadow-sm cursor-pointer mt-2"
                    style={{ fontFamily: 'var(--font-body)' }}
                  >
                    {status === 'loading' ? (
                      <>
                        <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Creating Account...
                      </>
                    ) : (
                      <>
                        Create Account
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                        </svg>
                      </>
                    )}
                  </button>
                </form>

                {/* Divider */}
                <div className="relative my-6 text-center">
                  <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-px bg-border-warm" />
                  <span
                    className="relative z-10 px-3 bg-bg-primary text-[10px] font-bold text-text-muted uppercase tracking-widest"
                    style={{ fontFamily: 'var(--font-body)' }}
                  >
                    or continue with
                  </span>
                </div>

                {/* Social Login list */}
                <div className="space-y-2.5">
                  {/* GitHub */}
                  <button
                    type="button"
                    className="w-full flex items-center justify-center gap-2.5 px-4 py-2.5 rounded-xl border border-border-warm bg-bg-primary text-xs font-bold text-text-primary hover:bg-bg-secondary transition-colors cursor-pointer"
                    style={{ fontFamily: 'var(--font-body)' }}
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.464-1.11-1.464-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.579.688.481C19.137 20.162 22 16.418 22 12c0-5.523-4.477-10-10-10z" />
                    </svg>
                    Continue with GitHub
                  </button>

                  {/* Google */}
                  <button
                    type="button"
                    className="w-full flex items-center justify-center gap-2.5 px-4 py-2.5 rounded-xl border border-border-warm bg-bg-primary text-xs font-bold text-text-primary hover:bg-bg-secondary transition-colors cursor-pointer"
                    style={{ fontFamily: 'var(--font-body)' }}
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24">
                      <path fill="#EA4335" d="M12.24 10.285V14.4h6.887c-.275 1.565-1.88 4.604-6.887 4.604-4.33 0-7.859-3.578-7.859-8s3.53-8 7.859-8c2.46 0 4.105 1.025 5.047 1.926l3.227-3.107C18.29 1.942 15.52 1 12.24 1 6.06 1 1 5.925 1 12s5.06 11 11.24 11c6.45 0 10.74-4.537 10.74-10.922 0-.733-.08-1.284-.176-1.793H12.24z" />
                    </svg>
                    Continue with Google
                  </button>

                  {/* Microsoft */}
                  <button
                    type="button"
                    className="w-full flex items-center justify-center gap-2.5 px-4 py-2.5 rounded-xl border border-border-warm bg-bg-primary text-xs font-bold text-text-primary hover:bg-bg-secondary transition-colors cursor-pointer"
                    style={{ fontFamily: 'var(--font-body)' }}
                  >
                    <svg className="w-4 h-4" viewBox="0 0 23 23">
                      <path fill="#F25022" d="M0 0h11v11H0z" />
                      <path fill="#7FBA00" d="M12 0h11v11H12z" />
                      <path fill="#00A4EF" d="M0 12h11v11H0z" />
                      <path fill="#FFB900" d="M12 12h11v11H12z" />
                    </svg>
                    Continue with Microsoft
                  </button>
                </div>

                {/* Bottom security assurance alert */}
                <div
                  className="mt-6 rounded-xl p-3 flex gap-3 items-start"
                  style={{ background: 'var(--color-bg-primary)', border: '1px solid var(--color-border)' }}
                >
                  <div className="text-accent mt-0.5">
                    🛡️
                  </div>
                  <div className="space-y-0.5 text-left">
                    <p className="text-[10px] font-bold text-text-primary uppercase tracking-wider" style={{ fontFamily: 'var(--font-body)' }}>Enterprise-Grade Security</p>
                    <p className="text-[9px] text-text-muted leading-relaxed" style={{ fontFamily: 'var(--font-body)' }}>
                      Your data is encrypted and protected. We never share your information with third parties.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

        </div>
      </main>
    </div>
  );
}
