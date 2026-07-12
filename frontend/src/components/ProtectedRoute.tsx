import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { useUIStore } from '../store/useUIStore';
import { useEffect } from 'react';

interface ProtectedRouteProps {
  children: React.ReactElement;
}

/**
 * ProtectedRoute Wrapper
 * Prevents non-authenticated users from briefly seeing/loading page contents.
 * Instantly redirects to the landing page and opens the login modal.
 */
export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const accessToken = useAuthStore((state) => state.accessToken);
  const openLoginModal = useUIStore((state) => state.openLoginModal);

  useEffect(() => {
    if (!accessToken) {
      // Trigger the login modal after navigation has occurred
      openLoginModal();
    }
  }, [accessToken, openLoginModal]);

  if (!accessToken) {
    // Perform a direct router redirect on render to prevent any UI flashing
    return <Navigate to="/" replace />;
  }

  return children;
}
