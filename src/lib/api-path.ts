/**
 * Prefix a path with the app's basePath if provided.
 * Use for manual fetches to API routes so deployments behind a path prefix work.
 * Example:
 *   fetch(withBasePath('/api/ai/settings'))
 */
export function withBasePath(path: string): string {
  const baseRaw = process.env.NEXT_PUBLIC_BASE_PATH || '';
  const base = baseRaw.endsWith('/') ? baseRaw.slice(0, -1) : baseRaw;
  const p = path.startsWith('/') ? path : `/${path}`;
  return `${base}${p}`;
}