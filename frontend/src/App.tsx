import { Routes, Route } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import SignupPage from './pages/SignupPage';
import ScansPage from './pages/ScansPage';
import ProgressPage from './pages/ProgressPage';
import ResultsPage from './pages/ResultsPage';
import { LoginModal } from './components/LoginModal';

/**
 * Root App component.
 * Renders page routes under the global BrowserRouter context set in main.tsx.
 */
export default function App() {
  return (
    <>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/scans" element={<ScansPage />} />
        <Route path="/scan/:id/progress" element={<ProgressPage />} />
        <Route path="/scan/:id/results" element={<ResultsPage />} />
      </Routes>
      <LoginModal />
    </>
  );
}
