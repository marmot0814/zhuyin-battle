const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

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

  return response;
}
