import Link from "next/link";
import { EmptyState } from "@/ui/states";

export default function NotFound() {
  return (
    <EmptyState
      title="リポジトリが見つかりません"
      description="URL が正しいか、リポジトリが削除されていないかを確認してください。"
      action={
        <Link
          href="/"
          className="rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-sm hover:bg-neutral-100"
        >
          検索に戻る
        </Link>
      }
    />
  );
}
