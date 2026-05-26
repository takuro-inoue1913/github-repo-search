import { describe, expect, it } from "vitest";
import { formatCount, formatNumber, formatRelativeDate } from "./format";

describe("formatNumber", () => {
  it("3 桁区切りでフォーマットする", () => {
    expect(formatNumber(0)).toBe("0");
    expect(formatNumber(1234)).toBe("1,234");
    expect(formatNumber(1234567)).toBe("1,234,567");
  });
});

describe("formatCount", () => {
  it("1000 未満はプレーン表記", () => {
    expect(formatCount(0)).toBe("0");
    expect(formatCount(999)).toBe("999");
  });

  it("1000 以上は compact 表記に切り替える", () => {
    // ja-JP の compact では「1.2万」「1,200」など実装依存だが、999 とは異なる表記になる
    const v = formatCount(1234);
    expect(v).not.toBe("1,234");
    expect(v.length).toBeLessThan("1,234".length + 2);
  });
});

describe("formatRelativeDate", () => {
  const now = new Date("2026-05-26T12:00:00Z");

  it("数十秒前は秒単位の相対表記", () => {
    const iso = new Date(now.getTime() - 30 * 1000).toISOString();
    expect(formatRelativeDate(iso, now)).toMatch(/秒/);
  });

  it("数十分前は分単位の相対表記", () => {
    const iso = new Date(now.getTime() - 30 * 60 * 1000).toISOString();
    expect(formatRelativeDate(iso, now)).toMatch(/分/);
  });

  it("数時間前は時間単位の相対表記", () => {
    const iso = new Date(now.getTime() - 3 * 3600 * 1000).toISOString();
    expect(formatRelativeDate(iso, now)).toMatch(/時間/);
  });

  it("数日前は日単位の相対表記", () => {
    const iso = new Date(now.getTime() - 5 * 86400 * 1000).toISOString();
    expect(formatRelativeDate(iso, now)).toMatch(/日前/);
  });

  it("30 日以上前は YYYY/MM/DD の絶対日付", () => {
    const iso = new Date(now.getTime() - 365 * 86400 * 1000).toISOString();
    expect(formatRelativeDate(iso, now)).toMatch(/^\d{4}\/\d{2}\/\d{2}$/);
  });

  it("不正な ISO 文字列は入力をそのまま返す", () => {
    expect(formatRelativeDate("not-a-date", now)).toBe("not-a-date");
  });
});
