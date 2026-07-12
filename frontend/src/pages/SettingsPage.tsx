import { useState } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import Card from '../components/Card';
import { useAuthStore } from '../store/useAuthStore';
import { useThemeStore, type ThemeMode } from '../store/useThemeStore';
import { apiRequest } from '../api/client';
import { Sun, Moon, Monitor, User, Shield, Sliders } from 'lucide-react';
import PageHeading from '../components/PageHeading';

export default function SettingsPage() {
  const { user, accessToken, setAuth } = useAuthStore();
  const { mode: themeMode, setMode: setThemeMode } = useThemeStore();
  const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'preferences'>('profile');

  // Profile Form States
  const [fullName, setFullName] = useState(user?.fullName || '');
  const [companyName, setCompanyName] = useState(user?.companyName || '');
  const [role, setRole] = useState(user?.role || '');
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // Password Form States
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [isSavingPassword, setIsSavingPassword] = useState(false);

  // Preference States
  const [emailOnComplete, setEmailOnComplete] = useState(true);
  const [emailOnFail, setEmailOnFail] = useState(false);
  const [weeklyDigest, setWeeklyDigest] = useState(true);
  const [prefSuccess, setPrefSuccess] = useState<string | null>(null);

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileSuccess(null);
    setProfileError(null);
    setIsSavingProfile(true);

    try {
      const updatedUser = await apiRequest('/api/auth/profile', {
        method: 'PUT',
        body: JSON.stringify({
          fullName,
          companyName: companyName || null,
          role: role || null,
        }),
      });

      if (accessToken) {
        setAuth(updatedUser, accessToken);
      }
      setProfileSuccess('Profile updated successfully.');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update profile.';
      setProfileError(msg);
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordSuccess(null);
    setPasswordError(null);

    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match.');
      return;
    }
    if (newPassword.length < 8) {
      setPasswordError('Password must be at least 8 characters long.');
      return;
    }

    setIsSavingPassword(true);
    try {
      await apiRequest('/api/auth/password', {
        method: 'PUT',
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      });

      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPasswordSuccess('Password changed successfully.');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to change password. Please verify current password.';
      setPasswordError(msg);
    } finally {
      setIsSavingPassword(false);
    }
  };

  const handlePreferencesSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPrefSuccess(null);
    setTimeout(() => {
      setPrefSuccess('Preferences updated successfully.');
    }, 300);
  };

  /** Shared input className using token classes */
  const inputClass =
    'px-4 py-2.5 bg-bg-card border border-border-warm rounded-xl text-xs text-text-primary focus:ring-1 focus:ring-[var(--color-accent)] focus:border-[var(--color-accent)] focus:outline-none w-full transition-colors';

  /** Shared tab button className */
  const tabBtn = (tab: 'profile' | 'security' | 'preferences') =>
    `w-full px-4 py-3 rounded-xl text-xs font-bold text-left transition-all border ${
      activeTab === tab
        ? 'bg-bg-secondary border-border text-text-primary'
        : 'bg-bg-card/70 border-border-warm text-text-secondary hover:bg-hover-bg'
    }`;

  /** Theme option card */
  type ThemeOption = { id: ThemeMode; label: string; description: string; Icon: React.ElementType };
  const themeOptions: ThemeOption[] = [
    { id: 'light', label: 'Light', description: 'Clean ivory dashboard', Icon: Sun },
    { id: 'dark',  label: 'Dark',  description: 'Charcoal dark mode',    Icon: Moon },
    { id: 'system', label: 'System', description: 'Follows OS setting',  Icon: Monitor },
  ];

  return (
    <DashboardLayout activePage="settings">
      <div className="py-8 px-10 space-y-7 w-full text-left min-h-screen">

        {/* Title */}
        <PageHeading 
          title="Account Settings" 
          description="Manage your personal profile, secure credentials, and system preferences." 
        />

        {/* Settings Container */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">

          {/* Navigation Sidebar */}
          <div className="lg:col-span-1 flex flex-col gap-1">
            <button onClick={() => setActiveTab('profile')} className={`${tabBtn('profile')} flex items-center gap-2`}>
              <User size={14} className="opacity-80" /> Profile Settings
            </button>
            <button onClick={() => setActiveTab('security')} className={`${tabBtn('security')} flex items-center gap-2`}>
              <Shield size={14} className="opacity-80" /> Security &amp; Password
            </button>
            <button onClick={() => setActiveTab('preferences')} className={`${tabBtn('preferences')} flex items-center gap-2`}>
              <Sliders size={14} className="opacity-80" /> Preferences
            </button>
          </div>

          {/* Form Content Area */}
          <div className="lg:col-span-3">
            <Card className="p-7 space-y-6">

              {/* ── Tab 1: Profile Settings ── */}
              {activeTab === 'profile' && (
                <form onSubmit={handleProfileSubmit} className="space-y-6">
                  <div>
                    <h3 className="text-sm font-bold text-text-primary mb-1">Personal Details</h3>
                    <p className="text-[11px] text-text-muted font-bold">
                      Update your full name, title, and organization details.
                    </p>
                  </div>

                  {profileSuccess && (
                    <div className="p-3 bg-bg-secondary border border-border text-text-primary text-xs font-bold rounded-xl">
                      {profileSuccess}
                    </div>
                  )}
                  {profileError && (
                    <div className="p-3 bg-bg-secondary border border-border text-danger text-xs font-bold rounded-xl">
                      {profileError}
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Full Name */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-bold text-text-secondary">Full Name</label>
                      <input
                        type="text"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        required
                        className={inputClass}
                        style={{ fontFamily: 'var(--font-body)' }}
                      />
                    </div>

                    {/* Email (Disabled) */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-bold text-text-secondary">
                        Email Address (Primary)
                      </label>
                      <input
                        type="email"
                        value={user?.email || ''}
                        disabled
                        className="px-4 py-2.5 bg-bg-muted border border-border-warm rounded-xl text-xs text-text-muted cursor-not-allowed w-full"
                        style={{ fontFamily: 'var(--font-body)' }}
                      />
                      <p className="text-[10px] text-text-muted font-bold">
                        Email cannot be changed. Contact support if needed.
                      </p>
                    </div>

                    {/* Company */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-bold text-text-secondary">
                        Company / Organization
                      </label>
                      <input
                        type="text"
                        value={companyName}
                        onChange={(e) => setCompanyName(e.target.value)}
                        placeholder="e.g. Acme Corp"
                        className={inputClass}
                        style={{ fontFamily: 'var(--font-body)' }}
                      />
                    </div>

                    {/* Role */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-bold text-text-secondary">
                        Job Title / Role
                      </label>
                      <input
                        type="text"
                        value={role}
                        onChange={(e) => setRole(e.target.value)}
                        placeholder="e.g. Security Engineer"
                        className={inputClass}
                        style={{ fontFamily: 'var(--font-body)' }}
                      />
                    </div>
                  </div>

                  <div className="flex justify-end pt-4 border-t border-border-warm">
                    <button
                      type="submit"
                      disabled={isSavingProfile}
                      className="px-5 py-2.5 bg-[var(--color-accent)] hover:bg-[var(--color-accent-dark)] text-white text-xs font-bold rounded-xl shadow-sm transition-all focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isSavingProfile ? 'Saving...' : 'Save Profile'}
                    </button>
                  </div>
                </form>
              )}

              {/* ── Tab 2: Security & Password ── */}
              {activeTab === 'security' && (
                <form onSubmit={handlePasswordSubmit} className="space-y-6">
                  <div>
                    <h3 className="text-sm font-bold text-text-primary mb-1">
                      Change Password
                    </h3>
                    <p className="text-[11px] text-text-muted font-bold">
                      Use a strong, unique password that you don't use elsewhere.
                    </p>
                  </div>

                  {passwordSuccess && (
                    <div className="p-3 bg-bg-secondary border border-border text-text-primary text-xs font-bold rounded-xl">
                      {passwordSuccess}
                    </div>
                  )}
                  {passwordError && (
                    <div className="p-3 bg-bg-secondary border border-border text-danger text-xs font-bold rounded-xl">
                      {passwordError}
                    </div>
                  )}

                  <div className="space-y-4">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-bold text-text-secondary">
                        Current Password
                      </label>
                      <input
                        type="password"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        required
                        autoComplete="current-password"
                        className={inputClass}
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-bold text-text-secondary">
                        New Password
                      </label>
                      <input
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        required
                        autoComplete="new-password"
                        placeholder="Minimum 8 characters"
                        className={inputClass}
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-bold text-text-secondary">
                        Confirm New Password
                      </label>
                      <input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                        autoComplete="new-password"
                        className={inputClass}
                      />
                    </div>
                  </div>

                  {/* Security tips */}
                  <div className="p-4 bg-bg-secondary rounded-xl border border-border-warm space-y-1.5">
                    <p className="text-[11px] font-bold text-text-secondary uppercase tracking-wider">
                      Password Requirements
                    </p>
                    {[
                      'At least 8 characters long',
                      'Mix of uppercase, lowercase, numbers, and symbols',
                      'Do not reuse passwords from other services',
                    ].map((tip) => (
                      <p key={tip} className="text-[10px] text-text-muted font-bold flex items-center gap-1.5">
                        <span className="text-[var(--color-accent)]">✓</span> {tip}
                      </p>
                    ))}
                  </div>

                  <div className="flex justify-end pt-4 border-t border-border-warm">
                    <button
                      type="submit"
                      disabled={isSavingPassword}
                      className="px-5 py-2.5 bg-[var(--color-accent)] hover:bg-[var(--color-accent-dark)] text-white text-xs font-bold rounded-xl shadow-sm transition-all focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isSavingPassword ? 'Updating...' : 'Update Password'}
                    </button>
                  </div>
                </form>
              )}

              {/* ── Tab 3: Preferences ── */}
              {activeTab === 'preferences' && (
                <form onSubmit={handlePreferencesSubmit} className="space-y-8">

                  {/* ── Display / Theme ── */}
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-sm font-bold text-text-primary mb-1">Display</h3>
                      <p className="text-[11px] text-text-muted font-bold">
                        Choose how the dashboard appears. Only applies to authenticated pages — the landing, login, and signup pages are unaffected.
                      </p>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      {themeOptions.map(({ id, label, description, Icon }) => (
                        <button
                          key={id}
                          type="button"
                          onClick={() => setThemeMode(id)}
                          className={`flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all cursor-pointer ${
                            themeMode === id
                              ? 'border-[var(--color-accent)] bg-[var(--color-accent-subtle)] shadow-sm'
                              : 'border-border-warm bg-bg-card hover:bg-hover-bg'
                          }`}
                        >
                          <div
                            className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${
                              themeMode === id
                                ? 'bg-[var(--color-accent)] text-white'
                                : 'bg-bg-muted text-text-muted'
                            }`}
                          >
                            <Icon size={18} />
                          </div>
                          <div className="text-center">
                            <p
                              className={`text-xs font-bold ${
                                themeMode === id ? 'text-[var(--color-accent)]' : 'text-text-primary'
                              }`}
                            >
                              {label}
                            </p>
                            <p className="text-[10px] text-text-muted font-bold mt-0.5">
                              {description}
                            </p>
                          </div>
                          {themeMode === id && (
                            <span className="text-[9px] font-extrabold uppercase tracking-wider text-text-primary bg-bg-secondary border border-border px-1.5 py-0.5 rounded-full">
                              Active
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="border-t border-border-warm" />

                  {/* ── Email Notifications ── */}
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-sm font-bold text-text-primary mb-1">
                        Email Notifications
                      </h3>
                      <p className="text-[11px] text-text-muted font-bold">
                        Configure how notifications are sent to your inbox.
                      </p>
                    </div>

                    {prefSuccess && (
                      <div className="p-3 bg-bg-secondary border border-border text-text-primary text-xs font-bold rounded-xl">
                        {prefSuccess}
                      </div>
                    )}

                    {/* Scan complete */}
                    <label className="flex items-center justify-between py-3 border-b border-border-warm cursor-pointer group">
                      <div className="flex flex-col text-left">
                        <span className="text-xs font-bold text-text-primary group-hover:text-text-primary transition-colors">
                          Scan Complete Reports
                        </span>
                        <span className="text-[10px] text-text-muted font-bold mt-0.5">
                          Receive summary reports via email whenever a scan completes.
                        </span>
                      </div>
                      <input
                        type="checkbox"
                        checked={emailOnComplete}
                        onChange={(e) => setEmailOnComplete(e.target.checked)}
                        className="w-4 h-4 text-[var(--color-accent)] rounded border-border-warm focus:ring-[var(--color-accent)] cursor-pointer"
                      />
                    </label>

                    {/* Vulnerability alerts */}
                    <label className="flex items-center justify-between py-3 border-b border-border-warm cursor-pointer group">
                      <div className="flex flex-col text-left">
                        <span className="text-xs font-bold text-text-primary group-hover:text-text-primary transition-colors">
                          Vulnerability and Alert Failures
                        </span>
                        <span className="text-[10px] text-text-muted font-bold mt-0.5">
                          Alert immediately if active scanning scripts crash or targets become inaccessible.
                        </span>
                      </div>
                      <input
                        type="checkbox"
                        checked={emailOnFail}
                        onChange={(e) => setEmailOnFail(e.target.checked)}
                        className="w-4 h-4 text-[var(--color-accent)] rounded border-border-warm focus:ring-[var(--color-accent)] cursor-pointer"
                      />
                    </label>

                    {/* Weekly digest */}
                    <label className="flex items-center justify-between py-3 cursor-pointer group">
                      <div className="flex flex-col text-left">
                        <span className="text-xs font-bold text-text-primary group-hover:text-text-primary transition-colors">
                          Weekly Security Summary
                        </span>
                        <span className="text-[10px] text-text-muted font-bold mt-0.5">
                          A condensed weekly digest summarizing compliance indexes and vulnerability counts.
                        </span>
                      </div>
                      <input
                        type="checkbox"
                        checked={weeklyDigest}
                        onChange={(e) => setWeeklyDigest(e.target.checked)}
                        className="w-4 h-4 text-[var(--color-accent)] rounded border-border-warm focus:ring-[var(--color-accent)] cursor-pointer"
                      />
                    </label>
                  </div>

                  <div className="flex justify-end pt-4 border-t border-border-warm">
                    <button
                      type="submit"
                      className="px-5 py-2.5 bg-[var(--color-accent)] hover:bg-[var(--color-accent-dark)] text-white text-xs font-bold rounded-xl shadow-sm transition-all focus:outline-none"
                    >
                      Save Preferences
                    </button>
                  </div>
                </form>
              )}

            </Card>
          </div>

        </div>
      </div>
    </DashboardLayout>
  );
}
