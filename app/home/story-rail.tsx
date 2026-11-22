"use client";

import { useRouter } from "next/navigation";
import { useCallback, useRef, useState } from "react";

import type { HomeStoryGroup } from "@/lib/home/types";

import { Avatar } from "./avatar";
import { PlayIcon } from "./icons";
import { StoryViewer } from "./story-viewer";

export function StoryRail({ groups }: { groups: HomeStoryGroup[] }) {
  const router = useRouter();
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [viewed, setViewed] = useState<Set<string>>(() => new Set());
  const followChangedRef = useRef(false);

  const handleGroupViewed = useCallback((userId: string) => {
    setViewed((current) => {
      if (current.has(userId)) return current;
      const next = new Set(current);
      next.add(userId);
      return next;
    });
  }, []);

  const handleClose = useCallback(() => {
    setOpenIndex(null);
    if (followChangedRef.current) {
      followChangedRef.current = false;
      router.refresh();
    }
  }, [router]);

  const handleFollowChanged = useCallback(() => {
    followChangedRef.current = true;
  }, []);

  if (groups.length === 0) return null;

  return (
    <section aria-label="Stories" className="mb-4 sm:mb-5">
      <div className="-mx-1 flex gap-2.5 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:gap-3">
        {groups.map((group, index) => {
          const isViewed = viewed.has(group.userId) || group.allViewed;
          const isUnwatched = !group.isOwn && !isViewed;
          const latest = group.stories[group.stories.length - 1] ?? group.stories[0];
          const cover =
            latest?.thumbnailUrl ??
            (latest?.mediaKind === "photo" ? latest.mediaUrl : undefined) ??
            group.author.avatarUrl;

          return (
            <button
              key={group.userId || group.author.id || index}
              type="button"
              onClick={() => setOpenIndex(index)}
              className={`group relative aspect-[10/17] w-[84px] shrink-0 overflow-hidden rounded-2xl border-2 bg-soft text-left shadow-sm transition hover:brightness-105 sm:w-[108px] md:w-[122px] lg:w-[138px] ${
                isUnwatched ? "border-accent" : "border-line"
              }`}
              aria-label={`Open ${group.isOwn ? "your" : `${group.author.name}'s`} story`}
            >
              {cover ? (
                <img
                  src={cover}
                  alt=""
                  loading="lazy"
                  decoding="async"
                  className="absolute inset-0 h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
                />
              ) : (
                <span className="absolute inset-0 flex items-center justify-center bg-soft">
                  <Avatar
                    name={group.author.name}
                    src={group.author.avatarUrl}
                    size="lg"
                  />
                </span>
              )}

              <span
                aria-hidden
                className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/90 via-black/45 to-transparent"
              />

              {isUnwatched ? (
                <span className="absolute left-1.5 top-1.5 rounded-full bg-accent px-1.5 py-0.5 text-[7px] font-extrabold uppercase tracking-[0.08em] text-white">
                  New
                </span>
              ) : null}

              {latest?.mediaKind === "video" ? (
                <span className="absolute right-1.5 top-1.5 inline-flex h-6 w-6 items-center justify-center rounded-full bg-black/55 text-white backdrop-blur">
                  <PlayIcon className="h-2.5 w-2.5" />
                </span>
              ) : null}

              <span
                className={`absolute inset-x-0 bottom-0 flex items-center gap-1.5 p-2 ${
                  isViewed ? "opacity-70" : ""
                }`}
              >
                <Avatar
                  name={group.author.name}
                  src={group.author.avatarUrl}
                  size="xs"
                />
                <span className="min-w-0 flex-1 truncate text-[9.5px] font-bold leading-tight text-white drop-shadow sm:text-[10px]">
                  {group.isOwn ? "Your story" : group.author.name}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      {openIndex !== null ? (
        <StoryViewer
          groups={groups}
          initialGroupIndex={openIndex}
          onClose={handleClose}
          onGroupViewed={handleGroupViewed}
          onFollowChanged={handleFollowChanged}
        />
      ) : null}
    </section>
  );
}
