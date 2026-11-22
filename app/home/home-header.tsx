import Image from "next/image";
import Link from "next/link";

import type { HomeProfile } from "@/lib/home/types";

import { ThemeToggle } from "../theme-toggle";
import { Avatar } from "./avatar";
import { LogoutButton } from "../../logout-button";

export function HomeHeader({
  profile,
  fallbackName,
}: {
  profile: HomeProfile | null;
  fallbackName: string;
}) {
  const name = profile?.name || fallbackName;

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-page/85 backdrop-blur-xl">
      <div className="flex w-full items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-2">
          <Link href="/home" className="flex min-w-0 items-center gap-2.5">
            <Image
              src="/brand/LogoMark.png"
              alt=""
              width={80}
              height={59}
              priority
              className="h-8 w-auto"
            />
            <span className="font-display text-lg font-bold tracking-tight text-ink">VuInn</span>
            <span className="hidden rounded-full border border-line px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.18em] text-faint sm:inline">
              Home
            </span>
          </Link>
        </div>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Link
            href="/profile"
            aria-label="Open your profile"
            className="hidden items-center gap-2 rounded-full border border-line bg-surface/70 py-1 pl-1 pr-3 transition hover:border-accent/30 sm:flex"
          >
            <Avatar name={name} src={profile?.avatarUrl} size="sm" />
            <span className="max-w-[140px] truncate text-xs font-semibold text-ink">{name}</span>
          </Link>
          <LogoutButton />
        </div>
      </div>
    </header>
  );
}
