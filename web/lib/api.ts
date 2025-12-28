const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH || '';

interface FetchOptions extends RequestInit {
  headers?: Record<string, string>;
}

export async function api(endpoint: string, options: FetchOptions = {}) {
  const token = localStorage.getItem('token');
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // Ensure endpoint starts with / if not present (optional, but good for safety)
  const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  });

  // Handle token expiration or invalid auth
  if (response.status === 401 || response.status === 403) {
    if (typeof window !== 'undefined') {
      // Check if it's a ban
      try {
        const clone = response.clone();
        const data = await clone.json();
        if (data.error === 'Account banned') {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          const params = new URLSearchParams({
            reason: data.reason || 'No reason provided',
            until: data.bannedUntil
          });
          window.location.href = `${BASE_PATH}/banned?${params.toString()}`;
          return response;
        }
      } catch (e) {
        // Ignore JSON parse error
      }

      localStorage.removeItem('token');
      localStorage.removeItem('user');
      
      // Redirect to home if not already there
      const homePath = BASE_PATH || '/';
      // Handle both with and without trailing slash
      const currentPath = window.location.pathname.replace(/\/$/, '');
      const targetHome = homePath.replace(/\/$/, '');
      
      if (currentPath !== targetHome) {
         window.location.href = homePath || '/';
      }
    }
  }

  return response;
}
