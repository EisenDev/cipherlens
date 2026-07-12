import { Routes, Route } from 'react-router-dom';
import ThemeProvider from './components/ThemeProvider';
import LandingPage from './pages/LandingPage';
import SignupPage from './pages/SignupPage';
import ScansPage from './pages/ScansPage';
import ProgressPage from './pages/ProgressPage';
import ResultsPage from './pages/ResultsPage';
import FindingsPage from './pages/FindingsPage';
import AIAnalysisPage from './pages/AIAnalysisPage';
import AssetsPage from './pages/AssetsPage';
import CompliancePage from './pages/CompliancePage';
import IntegrationsPage from './pages/IntegrationsPage';
import ApiKeysPage from './pages/ApiKeysPage';
import OrganizationsPage from './pages/OrganizationsPage';
import BillingPage from './pages/BillingPage';
import SchedulesPage from './pages/SchedulesPage';
import TeamPage from './pages/TeamPage';
import SettingsPage from './pages/SettingsPage';
import NotificationsPage from './pages/NotificationsPage';
import OverviewPage from './pages/OverviewPage';
import AuditLogsPage from './pages/AuditLogsPage';
import SupportPage from './pages/SupportPage';
import { LoginModal } from './components/LoginModal';
import NotFoundPage from './pages/NotFoundPage';
import AccessBlockedPage from './pages/AccessBlockedPage';
import PublicResultsPage from './pages/PublicResultsPage';
import ProtectedRoute from './components/ProtectedRoute';

/**
 * Root App component.
 * Renders page routes under the global BrowserRouter context set in main.tsx.
 */
export default function App() {
  return (
    <ThemeProvider>
      <>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/signup" element={<SignupPage />} />

        {/* Authenticated Protected Routes */}
        <Route path="/assets" element={<ProtectedRoute><AssetsPage /></ProtectedRoute>} />
        <Route path="/assets/:id" element={<ProtectedRoute><AssetsPage /></ProtectedRoute>} />
        <Route path="/scans" element={<ProtectedRoute><ScansPage /></ProtectedRoute>} />
        <Route path="/findings" element={<ProtectedRoute><FindingsPage /></ProtectedRoute>} />
        <Route path="/ai-analysis" element={<ProtectedRoute><AIAnalysisPage /></ProtectedRoute>} />
        <Route path="/compliance" element={<ProtectedRoute><CompliancePage /></ProtectedRoute>} />
        <Route path="/integrations" element={<ProtectedRoute><IntegrationsPage /></ProtectedRoute>} />
        <Route path="/api-keys" element={<ProtectedRoute><ApiKeysPage /></ProtectedRoute>} />
        <Route path="/organizations" element={<ProtectedRoute><OrganizationsPage /></ProtectedRoute>} />
        <Route path="/billing" element={<ProtectedRoute><BillingPage /></ProtectedRoute>} />
        <Route path="/schedules" element={<ProtectedRoute><SchedulesPage /></ProtectedRoute>} />
        <Route path="/team" element={<ProtectedRoute><TeamPage /></ProtectedRoute>} />
        <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
        <Route path="/notifications" element={<ProtectedRoute><NotificationsPage /></ProtectedRoute>} />
        <Route path="/overview" element={<ProtectedRoute><OverviewPage /></ProtectedRoute>} />
        <Route path="/audit-logs" element={<ProtectedRoute><AuditLogsPage /></ProtectedRoute>} />
        <Route path="/support" element={<ProtectedRoute><SupportPage /></ProtectedRoute>} />
        <Route path="/scan/:id/progress" element={<ProtectedRoute><ProgressPage /></ProtectedRoute>} />

        {/* Public & Self-Guarded Routes */}
        <Route path="/scan/:id/results" element={<ResultsPage />} />
        <Route path="/share/:shareToken" element={<PublicResultsPage />} />
        <Route path="/access-blocked" element={<AccessBlockedPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
      <LoginModal />
    </>
    </ThemeProvider>
  );
}
