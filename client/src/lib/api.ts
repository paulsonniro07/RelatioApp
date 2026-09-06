import axios from 'axios';

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080/api';

const api = axios.create({
  baseURL: API_BASE_URL,
});

/**
 * Turns a stored photo value into an <img> src.
 * - External http(s) URLs pass through unchanged (legacy value or future paste-URL).
 * - Managed uploads are stored as "/api/uploads/<file>": in Docker the client
 *   base is the relative "/api" (same origin → nginx proxies it); in local dev
 *   the base is an absolute API origin, so resolve against that origin.
 */
export function resolveApiPhotoUrl(photoUrl: string | null): string | undefined {
  if (!photoUrl) return undefined;
  if (/^https?:\/\//i.test(photoUrl)) return photoUrl;
  if (photoUrl.startsWith('/api/')) {
    if (/^https?:\/\//i.test(API_BASE_URL)) return new URL(photoUrl, API_BASE_URL).toString();
    return photoUrl;
  }
  return photoUrl;
}

export default api;
