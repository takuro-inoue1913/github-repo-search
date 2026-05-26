import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import "dayjs/locale/ja";

dayjs.extend(relativeTime);
dayjs.locale("ja");

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

export function formatRelativeDate(iso: string, now: Date = new Date()): string {
  const date = dayjs(iso);
  if (!date.isValid()) return iso;
  const base = dayjs(now);
  // 30 日以内は相対表記 (例: 「3 日前」)、それ以上は絶対日付に切り替える
  if (Math.abs(base.diff(date, "day")) < 30) {
    return date.from(base);
  }
  return date.format("YYYY/MM/DD");
}
