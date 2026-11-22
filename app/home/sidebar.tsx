"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import type { ComponentType } from "react";

import {
  ChevronLeftIcon,
  HomeIcon,
  MenuIcon,
  ReelsIcon,
  VideoIcon,
  UserIcon,
  // Entries below have no page yet, so their icons are commented out with them.
  // Uncomment the icon together with the sidebar row that uses it.
  // ChatIcon,
  // ClockIcon,
  // FeedbackIcon,
  // HeartIcon,
  // HelpIcon,
  // HistoryIcon,
  // PlaylistIcon,
  // SettingsIcon,

} from "./icons";

type NavItem = {
  id: string;
  label: string;
  href?: string;
  Icon: ComponentType<{ className?: string }>;
};

const primaryTabs: NavItem[] = [
  { id: "home", label: "Home", href: "/home", Icon: HomeIcon },
  { id: "reels", label: "Inn", href: "/reels", Icon: ReelsIcon },
  { id: "videos", label: "Videos", href: "/videos", Icon: VideoIcon },
  { id: "profile", label: "Profile", href: "/profile", Icon: UserIcon },
  // No /chat or /profile page exists in the web app yet. Uncomment a row
  // (and its commented icon import) once that route ships.
  // { id: "chat", label: "Chat", Icon: ChatIcon },
];

const detailSections: { title: string; items: NavItem[] }[] = [
  // None of these have a page yet, so the sections stay hidden. Uncomment a
  // whole section (and the icons it uses) when its routes ship.
  // {
  //   title: "You",
  //   items: [
  //     { id: "history", label: "History", Icon: HistoryIcon },
  //     { id: "playlists", label: "Playlists", Icon: PlaylistIcon },
  //     { id: "your-videos", label: "Your videos", Icon: VideoIcon },
  //     { id: "watch-later", label: "Watch later", Icon: ClockIcon },
  //     { id: "liked-videos", label: "Liked videos", Icon: HeartIcon },
  //   ],
  // },
  // {
  //   title: "Settings",
  //   items: [
  //     { id: "settings", label: "Settings", Icon: SettingsIcon },
  //     { id: "help", label: "Help", Icon: HelpIcon },
  //     { id: "feedback", label: "Send feedback", Icon: FeedbackIcon },
  //   ],
  // },
];

export function Sidebar({
  expanded,
  onToggle,
}: {
  expanded: boolean;
  onToggle: () => void;
}) {
  const pathname = usePathname();

  return (
    <aside
      aria-label="Sidebar"
      className={`fixed bottom-0 left-0 top-0 z-20 hidden flex-col overflow-y-auto border-r border-line bg-page/90 backdrop-blur-xl transition-[width] duration-200 sm:flex ${
        expanded ? "w-[248px]" : "w-[88px]"
      }`}
    >
      <div
        className={`flex h-12 shrink-0 items-center gap-2 px-3 ${
          expanded ? "" : "justify-center"
        }`}
      >
        <button
          type="button"
          onClick={onToggle}
          aria-label={expanded ? "Collapse sidebar" : "Expand sidebar"}
          aria-expanded={expanded}
          aria-controls="home-sidebar-nav"
          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-line bg-surface/70 text-muted transition hover:border-accent/30 hover:text-ink"
        >
          {expanded ? (
            <ChevronLeftIcon className="h-4 w-4" />
          ) : (
            <MenuIcon className="h-4 w-4" />
          )}
        </button>
        {expanded ? (
          <span className="text-[9px] font-semibold uppercase tracking-[0.22em] text-faint">
            Menu
          </span>
        ) : null}
      </div>

      <nav id="home-sidebar-nav" aria-label="Primary" className="flex flex-col gap-1 px-2 pb-4">
        {primaryTabs.map((item) => (
          <SidebarRow
            key={item.id}
            item={item}
            expanded={expanded}
            active={pathname === item.href}
          />
        ))}
      </nav>

      {expanded && detailSections.length > 0 ? (
        <div className="border-t border-line px-2 pb-8 pt-4">
          {detailSections.map((section) => (
            <div key={section.title} className="mb-5 last:mb-0">
              <p className="px-3 pb-2 text-[9px] font-semibold uppercase tracking-[0.22em] text-faint">
                {section.title}
              </p>
              <div className="flex flex-col gap-1">
                {section.items.map((item) => (
                  <SidebarRow
                    key={item.id}
                    item={item}
                    expanded
                    active={pathname === item.href}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </aside>
  );
}

function SidebarRow({
  item,
  expanded,
  active,
}: {
  item: NavItem;
  expanded: boolean;
  active: boolean;
}) {
  const Icon = item.Icon;
  const layout = expanded
    ? "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[13px]"
    : "flex w-full flex-col items-center gap-1 rounded-xl px-1 py-3 text-[9.5px]";

  const classes = `${layout} transition ${
    active
      ? "bg-accent-soft font-semibold text-accent"
      : "font-medium text-muted hover:bg-soft hover:text-ink"
  }`;

  const content = (
    <>
      <Icon className={expanded ? "h-5 w-5 shrink-0" : "h-[22px] w-[22px] shrink-0"} />
      <span className={expanded ? "truncate" : "w-full truncate text-center"}>{item.label}</span>
    </>
  );

  if (item.href) {
    return (
      <Link
        href={item.href}
        aria-current={active ? "page" : undefined}
        className={classes}
      >
        {content}
      </Link>
    );
  }

  return (
    <span
      aria-disabled="true"
      title={`${item.label} is coming soon`}
      className={`${classes} cursor-default opacity-60`}
    >
      {content}
    </span>
  );
}
