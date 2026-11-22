const compactNumber = new Intl.NumberFormat("en", {
  notation: "compact",
  maximumFractionDigits: 1,
});

export function formatCount(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return "0";
  return compactNumber.format(Math.trunc(value));
}

export function timeAgo(value: string | number | Date | null | undefined): string {
  if (value === null || value === undefined || value === "") return "";

  const date = value instanceof Date ? value : new Date(value);
  const timestamp = date.getTime();
  if (!Number.isFinite(timestamp)) return "";

  const seconds = Math.max(1, Math.round((Date.now() - timestamp) / 1000));
  if (seconds < 60) return `${seconds}s`;

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;

  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks}w`;

  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo`;

  return `${Math.floor(days / 365)}y`;
}
