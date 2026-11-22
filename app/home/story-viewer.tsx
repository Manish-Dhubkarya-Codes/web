"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type { HomeStoryGroup } from "@/lib/home/types";

import { recordStoryView, toggleFollowUser } from "./actions";
import { Avatar } from "./avatar";
import { CloseIcon } from "./icons";
import { VideoMedia } from "./video-media";

const PHOTO_DURATION_MS = 5_000;

export function StoryViewer({
  groups,
  initialGroupIndex,
  onClose,
  onGroupViewed,
  onFollowChanged,
}: {
  groups: HomeStoryGroup[];
  initialGroupIndex: number;
  onClose: () => void;
  onGroupViewed: (userId: string) => void;
  onFollowChanged?: () => void;
}) {
  const [groupIndex, setGroupIndex] = useState(() =>
    Math.min(Math.max(initialGroupIndex, 0), Math.max(groups.length - 1, 0)),
  );
  const [storyIndex, setStoryIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [followingByUser, setFollowingByUser] = useState<Record<string, boolean>>({});
  const [followBusy, setFollowBusy] = useState(false);
  const [followError, setFollowError] = useState<{ userId: string; message: string } | null>(null);
  const recordedViews = useRef(new Set<string>());

  const group = groups[groupIndex];
  const story = group?.stories[storyIndex];
  const storyId = story?.id;
  const storyKind = story?.mediaKind;
  const isFollowing = group ? (followingByUser[group.userId] ?? group.isFollowing) : false;
  const visibleFollowError = followError?.userId === group?.userId ? followError.message : null;

  async function handleToggleFollow() {
    if (!group || group.isOwn || followBusy) return;

    const next = !isFollowing;
    setFollowingByUser((current) => ({ ...current, [group.userId]: next }));
    setFollowBusy(true);
    setFollowError(null);

    try {
      await toggleFollowUser(group.userId, next);
      window.dispatchEvent(
        new CustomEvent("vuinn:follow-changed", {
          detail: { userId: group.userId, following: next },
        }),
      );
      onFollowChanged?.();
    } catch {
      setFollowingByUser((current) => ({ ...current, [group.userId]: !next }));
      setFollowError({ userId: group.userId, message: "Couldn't update follow." });
    } finally {
      setFollowBusy(false);
    }
  }

  const goNext = useCallback(() => {
    setProgress(0);
    if (!group) {
      onClose();
      return;
    }

    if (storyIndex + 1 < group.stories.length) {
      setStoryIndex(storyIndex + 1);
      return;
    }

    if (groupIndex + 1 < groups.length) {
      setGroupIndex(groupIndex + 1);
      setStoryIndex(0);
      return;
    }

    onClose();
  }, [group, groupIndex, groups.length, onClose, storyIndex]);

  const goPrev = useCallback(() => {
    setProgress(0);
    if (!group) {
      onClose();
      return;
    }

    if (storyIndex > 0) {
      setStoryIndex(storyIndex - 1);
      return;
    }

    if (groupIndex > 0) {
      const previous = groups[groupIndex - 1];
      setGroupIndex(groupIndex - 1);
      setStoryIndex(Math.max(0, previous.stories.length - 1));
    }
  }, [group, groupIndex, groups, onClose, storyIndex]);

  useEffect(() => {
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = original;
    };
  }, []);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
      else if (event.key === "ArrowRight") goNext();
      else if (event.key === "ArrowLeft") goPrev();
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [goNext, goPrev, onClose]);

  useEffect(() => {
    if (!storyId || !group) return;

    if (!story?.isOwn && !recordedViews.current.has(storyId)) {
      recordedViews.current.add(storyId);
      void recordStoryView(storyId).catch(() => undefined);
    }
    onGroupViewed(group.userId);
  }, [storyId, group, story?.isOwn, onGroupViewed]);

  useEffect(() => {
    if (!storyId || storyKind !== "photo") return;

    const started = Date.now();
    const timer = setInterval(() => {
      const next = Math.min(1, (Date.now() - started) / PHOTO_DURATION_MS);
      setProgress(next);
      if (next >= 1) goNext();
    }, 100);

    return () => clearInterval(timer);
  }, [goNext, storyId, storyKind]);

  if (!group || !story) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 p-0 sm:p-6"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Story from ${group.author.name}`}
        className="relative flex h-[100dvh] w-full max-w-[480px] flex-col overflow-hidden bg-black sm:h-[min(860px,92dvh)] sm:rounded-3xl"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="absolute inset-x-0 top-0 z-20 flex gap-1 p-3">
          {group.stories.map((item, index) => (
            <span
              key={item.id}
              className="h-0.5 flex-1 overflow-hidden rounded-full bg-white/30"
            >
              <span
                className="block h-full rounded-full bg-white transition-[width] duration-100"
                style={{
                  width:
                    index < storyIndex ? "100%" : index === storyIndex ? `${progress * 100}%` : "0%",
                }}
              />
            </span>
          ))}
        </div>

        <div className="absolute inset-x-0 top-0 z-20 flex items-center gap-3 bg-gradient-to-b from-black/80 to-transparent px-3 pb-6 pt-6">
          <Avatar name={group.author.name} src={group.author.avatarUrl} size="sm" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[12.5px] font-semibold text-white">
              {group.isOwn ? "Your story" : group.author.name}
            </p>
            <p className="text-[10px] text-white/65">
              {story.createdAtLabel || "Just now"}
            </p>
          </div>
          {!group.isOwn ? (
            <div className="flex shrink-0 flex-col items-end gap-1">
              <button
                type="button"
                onClick={handleToggleFollow}
                disabled={followBusy}
                aria-busy={followBusy}
                aria-label={isFollowing ? `Unfollow ${group.author.name}` : `Follow ${group.author.name}`}
                title={isFollowing ? `Unfollow ${group.author.name}` : `Follow ${group.author.name}`}
                aria-pressed={isFollowing}
                className={`inline-flex min-w-[72px] items-center justify-center rounded-full border px-3.5 py-1.5 text-[10px] font-bold transition disabled:cursor-wait disabled:opacity-60 ${
                  isFollowing
                    ? "border-white/40 bg-white/15 text-white"
                    : "border-white/80 bg-white text-black hover:bg-white/90"
                }`}
              >
                {isFollowing ? "Following" : "Follow"}
              </button>
              {visibleFollowError ? (
                <span className="text-[9px] text-red-300">{visibleFollowError}</span>
              ) : null}
            </div>
          ) : null}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close story"
            className="rounded-full bg-black/40 p-2 text-white transition hover:bg-black/60"
          >
            <CloseIcon className="h-4 w-4" />
          </button>
        </div>

        <div key={story.id} className="relative flex flex-1 items-center justify-center overflow-hidden">
          {story.mediaKind === "video" ? (
            <VideoMedia
              key={story.id}
              src={story.mediaUrl}
              poster={story.thumbnailUrl}
              label={`Story from ${group.author.name}`}
              className="h-full w-full bg-black object-contain"
              autoPlay
              muted
              controls
              onEnded={goNext}
              onTimeUpdate={(currentTime, duration) => {
                if (duration > 0) setProgress(Math.min(1, currentTime / duration));
              }}
            />
          ) : (
            <img
              src={story.mediaUrl}
              alt={story.caption || `Story from ${group.author.name}`}
              className="h-full w-full object-contain"
            />
          )}

          <button
            type="button"
            aria-label="Previous story"
            onClick={goPrev}
            className="absolute inset-y-20 left-0 z-10 w-1/3"
          />
          <button
            type="button"
            aria-label="Next story"
            onClick={goNext}
            className="absolute inset-y-20 right-0 z-10 w-1/3"
          />

          {story.caption ? (
            <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-black/85 to-transparent px-5 pb-8 pt-16">
              <p className="text-[13px] leading-5 text-white">{story.caption}</p>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
