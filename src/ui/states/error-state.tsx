"use client";

import {
  NetworkError,
  NotFoundError,
  RateLimitError,
  UnknownApiError,
  ValidationError,
} from "@/lib/errors";

type Props = {
  error: unknown;
  onRetry?: () => void;
};

export function ErrorState({ error, onRetry }: Props) {
  const { title, description, canRetry } = describe(error);
  return (
    <div
      role="alert"
      aria-live="assertive"
      className="flex flex-col items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-6 text-red-900"
    >
      <div>
        <h2 className="text-base font-semibold">{title}</h2>
        <p className="mt-1 text-sm text-red-800">{description}</p>
      </div>
      {canRetry && onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="rounded-md border border-red-300 bg-white px-3 py-1.5 text-sm font-medium text-red-900 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-400"
        >
          再試行
        </button>
      )}
    </div>
  );
}

function describe(error: unknown): {
  title: string;
  description: string;
  canRetry: boolean;
} {
  if (error instanceof ValidationError) {
    return { title: "入力エラー", description: error.message, canRetry: false };
  }
  if (error instanceof NotFoundError) {
    return {
      title: "見つかりませんでした",
      description: error.message,
      canRetry: false,
    };
  }
  if (error instanceof RateLimitError) {
    const resetText = new Intl.DateTimeFormat("ja-JP", {
      hour: "2-digit",
      minute: "2-digit",
    }).format(error.resetAt);
    return {
      title: "アクセス上限に達しました",
      description: `GitHub API のレート制限に達しました。${resetText} 以降に再試行してください。`,
      canRetry: false,
    };
  }
  if (error instanceof NetworkError) {
    return {
      title: "ネットワークエラー",
      description: "サーバーに接続できませんでした。接続を確認して再試行してください。",
      canRetry: true,
    };
  }
  if (error instanceof UnknownApiError) {
    return {
      title: "サーバーエラー",
      description: `サーバーがエラーを返しました (status=${error.status})。少し待って再試行してください。`,
      canRetry: true,
    };
  }
  return {
    title: "予期しないエラーが発生しました",
    description: error instanceof Error ? error.message : "不明なエラー",
    canRetry: true,
  };
}
