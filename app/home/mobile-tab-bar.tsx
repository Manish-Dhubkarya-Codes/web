"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import type { ComponentType } from "react";

import { ChatIcon, HomeIcon, ReelsIcon, UserIcon, VideoIcon } from "./icons";

type Tab = {
  id: string;
  label: string;
  href?: string;
  Icon: ComponentType<{ className?: string }>;
};

const tabs: Tab[] = [
  { id: "home", label: "Home", href: "/home", Icon: HomeIcon },
  { id: "reels", label: "Inn", href: "/reels", Icon: ReelsIcon },
  { id: "chat", label: "Chat", Icon: ChatIcon },
  { id: "videos", label: "Videos", href: "/videos", Icon: VideoIcon },
  { id: "profile", label: "Profile", href: "/profile", Icon: UserIcon },
];

export function MobileTabBar() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Primary"
      className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center px-4 pb-[calc(env(safe-area-inset-bottom)+10px)] sm:hidden"
    >
      <div className="mobile-tabbar pointer-events-auto flex h-[52px] w-full max-w-[430px] items-center rounded-full border px-1.5 backdrop-blur-xl">
        {tabs.map((tab) => {
          const Icon = tab.Icon;

          if (tab.href) {
            const isActive = pathname === tab.href;

            return (
              <Link
                key={tab.id}
                href={tab.href}
                aria-current={isActive ? "page" : undefined}
                aria-label={tab.label}
                className="relative flex h-full flex-1 items-center justify-center rounded-full"
              >
                <span
                  aria-hidden
                  className={`mobile-tabbar-active absolute inset-x-0 inset-y-1.5 rounded-full border transition-opacity ${
                    isActive ? "opacity-100" : "opacity-0"
                  }`}
                />
                <Icon
                  className={`relative h-[23px] w-[23px] ${
                    isActive ? "mobile-tabbar-active-icon" : ""
                  }`}
                />
              </Link>
            );
          }

          return (
            <span
              key={tab.id}
              aria-disabled="true"
              aria-label={`${tab.label} (coming soon)`}
              title={`${tab.label} is coming soon`}
              className="flex h-full flex-1 cursor-default items-center justify-center text-ink opacity-70"
            >
              <Icon className="h-[23px] w-[23px]" />
            </span>
          );
        })}
      </div>
    </nav>
  );
}
