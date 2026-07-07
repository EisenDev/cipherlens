import { useAuthStore } from '../store/useAuthStore';

const getApiUrl = () => {
  return import.meta.env.VITE_API_URL || 'http://localhost:3005';
};

export const apiRequest = async (path: string, options: RequestInit = {}) => {
  const token = useAuthStore.getState().accessToken;
  const headers = new Headers(options.headers || {});

  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(`${getApiUrl()}${path}`, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    // Session expired, wipe tokens and logout automatically
    useAuthStore.getState().clearAuth();
    throw new Error('Unauthorized');
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || `API error (${response.status})`);
  }

  return response.json();
};
