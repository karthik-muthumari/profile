const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "2025-03-07" → "7 Mar 2025". Deterministic on purpose: Intl month names differ between Node's ICU and
 *  Safari's (en-GB "Sept" vs "Sep"), which made React throw hydration error #418 in WebKit only. */
export function formatDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return `${d} ${MONTHS[(m || 1) - 1]} ${y}`;
}
