/** Only in-app paths ("/cart") from a ?next= parameter, never another site. */
export function safeNext(next?: string | string[]): string | null {
  const n = Array.isArray(next) ? next[0] : next;
  return n && n.startsWith('/') && !n.startsWith('//') ? n : null;
}
