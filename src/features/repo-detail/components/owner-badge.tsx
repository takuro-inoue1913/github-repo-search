import Image from "next/image";
import type { Owner } from "@/types/repository";

export function OwnerBadge({ owner }: { owner: Owner }) {
  return (
    <a
      href={owner.htmlUrl}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-2 text-sm text-neutral-700 hover:text-neutral-900"
    >
      <Image
        src={owner.avatarUrl}
        alt=""
        width={24}
        height={24}
        className="rounded-full"
        unoptimized
      />
      <span>{owner.login}</span>
    </a>
  );
}
