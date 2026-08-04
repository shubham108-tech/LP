const isDev = import.meta.env.MODE === 'development';
const hostname = window.location.hostname;

// In dev, use the current hostname (works for localhost AND 192.168.x.x)
// In prod, use environment variable or fallback to live Vercel backend URL
export const SERVER_URL = isDev
    ? `http://${hostname}:5000`
    : (import.meta.env.VITE_API_URL || 'https://lp-wheat-nu.vercel.app');

export const API_BASE_URL = SERVER_URL.endsWith('/api') ? SERVER_URL : `${SERVER_URL}/api`;

