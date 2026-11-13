/** Dates the way a person reads them, not the way a database stores them. */

const MONTH = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function shortDate(iso: string | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(+d)) return "";
  const now = new Date();
  const sameYear = d.getFullYear() === now.getFullYear();
  return sameYear ? `${d.getDate()} ${MONTH[d.getMonth()]}` : `${d.getDate()} ${MONTH[d.getMonth()]} ${d.getFullYear()}`;
}

/** "in 5 days" / "3 days ago" / "today". Used for claim expiry, where the gap is what matters. */
export function relativeDays(iso: string | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(+d)) return "";
  const days = Math.round((+d - Date.now()) / 864e5);
  if (days === 0) return "today";
  if (days === 1) return "tomorrow";
  if (days === -1) return "yesterday";
  return days > 0 ? `in ${days} days` : `${-days} days ago`;
}

/** Today as YYYY-MM-DD in the device's own timezone, for date fields. */
export function today(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export const isDateLike = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s);

/** "3 contributions" / "1 contribution" */
export const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
