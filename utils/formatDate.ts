function toDDMMYYYY(date: Date): string {
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const yyyy = date.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
}

/**
 * Formats an ISO date string as DD-MM-YYYY.
 */
export function formatDate(isoString: string, _locale?: string): string {
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return isoString;
  return toDDMMYYYY(date);
}

/**
 * Formats both date and time as DD-MM-YYYY HH:MM.
 */
export function formatDateTime(isoString: string, _locale?: string): string {
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return isoString;
  const hh = String(date.getHours()).padStart(2, '0');
  const min = String(date.getMinutes()).padStart(2, '0');
  return `${toDDMMYYYY(date)} ${hh}:${min}`;
}

/**
 * Returns a relative time string (e.g. "منذ 3 دقائق").
 */
export function formatRelativeTime(isoString: string, locale: string = 'ar'): string {
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return isoString;

  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.floor(diffMs / 60_000);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  try {
    const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
    if (diffMinutes < 60) return rtf.format(-diffMinutes, 'minute');
    if (diffHours < 24) return rtf.format(-diffHours, 'hour');
    return rtf.format(-diffDays, 'day');
  } catch {
    // Fallback for environments without Intl.RelativeTimeFormat
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  }
}
