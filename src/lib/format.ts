const nfCompact = new Intl.NumberFormat("ja-JP", {
  notation: "compact",
  maximumFractionDigits: 1,
});
const nfPlain = new Intl.NumberFormat("ja-JP");

export function formatCount(n: number): string {
  if (n < 1000) return nfPlain.format(n);
  return nfCompact.format(n);
}

export function formatNumber(n: number): string {
  return nfPlain.format(n);
}

const rtf = new Intl.RelativeTimeFormat("ja-JP", { numeric: "auto" });
const dtf = new Intl.DateTimeFormat("ja-JP", { dateStyle: "medium" });

export function formatRelativeDate(iso: string, now: Date = new Date()): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  const diffMs = date.getTime() - now.getTime();
  const diffSec = Math.round(diffMs / 1000);
  const abs = Math.abs(diffSec);
  if (abs < 60) return rtf.format(diffSec, "second");
  if (abs < 3600) return rtf.format(Math.round(diffSec / 60), "minute");
  if (abs < 86400) return rtf.format(Math.round(diffSec / 3600), "hour");
  if (abs < 86400 * 30) return rtf.format(Math.round(diffSec / 86400), "day");
  return dtf.format(date);
}
