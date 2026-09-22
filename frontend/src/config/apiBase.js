/** Shared API base (baked in at build time via VITE_*). */
const DEFAULT_API_BASE = 'http://git.edumatrixtech.com/grievance/api';

/**
 * Resolve API base URL from frontend/.env
 * Never fall back to a bare localhost port — that breaks the test server
 * when VITE_API_BASE_URL is missing.
 */
export function resolveApiBaseUrl() {
  const raw = String(import.meta.env.VITE_API_BASE_URL || '')
    .trim()
    .replace(/\/$/, '');
  if (!raw) return DEFAULT_API_BASE;
  return raw;
}

export const API_BASE_URL = resolveApiBaseUrl();

export function assetUrl(path) {
  if (!path) return path;
  if (/^https?:\/\//i.test(path)) return path;
  const origin = API_BASE_URL.replace(/\/api\/?$/, '');
  const normalized = path.startsWith('/') ? path : `/${path}`;
  if (normalized.startsWith('/uploads/')) {
    return `${API_BASE_URL}${normalized}`;
  }
  if (normalized.startsWith('/api/')) {
    return `${origin}${normalized}`;
  }
  return `${API_BASE_URL}${normalized}`;
}

export default API_BASE_URL;
