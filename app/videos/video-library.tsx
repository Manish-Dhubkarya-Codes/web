"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import type { HomeFeedPage, HomePost } from "@/lib/home/types";

import { loadMoreReels, searchReels } from "../home/actions";
import { Avatar } from "../home/avatar";
import { PlayIcon, VolumeIcon } from "../home/icons";
import { VideoMedia } from "../home/video-media";

type SortMode = "latest" | "popular";

function formatDuration(seconds?: number): string {
  if (!seconds || seconds < 1) return "0:00";
  const total = Math.round(seconds);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}

function formatViews(post: HomePost): string {
  const views = post.likeCount * 23 + post.commentCount * 11;
  return views > 0 ? `${views.toLocaleString()} views` : "New video";
}

export function VideoLibrary({
  initialPage,
}: {
  initialPage: HomeFeedPage;
}) {
  const [posts, setPosts] = useState(initialPage.items);
  const [cursor, setCursor] = useState(initialPage.nextCursor);
  const [hasMore, setHasMore] = useState(initialPage.hasNextPage);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortMode>("latest");
  const [activeCategory, setActiveCategory] = useState("All");
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const seenIds = useRef(new Set(initialPage.items.map((post) => post.id)));
  const categories = ["All", "Travel", "Music", "Learning", "Stories"];

  useEffect(() => {
    const normalizedQuery = query.trim();
    let cancelled = false;
    const timeout = window.setTimeout(() => {
      if (!normalizedQuery) {
        setPosts(initialPage.items);
        setCursor(initialPage.nextCursor);
        setHasMore(initialPage.hasNextPage);
        setIsSearching(false);
        setIsLoadingMore(false);
        setError(null);
        return;
      }

      setIsSearching(true);
      setIsLoadingMore(false);
      setCursor(null);
      setHasMore(false);
      setError(null);

      const localTerms = normalizedQuery
        .normalize("NFKC")
        .toLowerCase()
        .replace(/^@/, "")
        .split(/\s+/)
        .filter(Boolean);
      setPosts((current) =>
        current.filter((post) => {
          const searchable = [
            post.caption,
            post.author.name,
            post.author.handle ? `@${post.author.handle}` : "",
            post.author.handle ?? "",
            post.location ?? "",
            post.author.id,
          ].join(" ").normalize("NFKC").toLowerCase();
          return localTerms.some((term) => searchable.includes(term));
        }),
      );

      void (async () => {
        try {
          const page = await searchReels(normalizedQuery);
          if (!cancelled) {
            setPosts((current) => {
              const seen = new Set(current.map((post) => post.id));
              return [
                ...current,
                ...page.items.filter((post) => {
                  if (seen.has(post.id)) return false;
                  seen.add(post.id);
                  return true;
                }),
              ];
            });
          }
        } catch {
          if (!cancelled) setError("Could not search all available videos.");
        } finally {
          if (!cancelled) setIsSearching(false);
        }
      })();
    }, 300);

    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, [query, initialPage.items, initialPage.nextCursor, initialPage.hasNextPage]);

  const visiblePosts = useMemo(() => {
    return [...posts]
      .filter((post) => {
        if (query.trim()) return true;
        const searchable = [
          post.caption,
          post.author.name,
          post.author.handle ? `@${post.author.handle}` : "",
          post.author.handle ?? "",
          post.location ?? "",
          post.author.id,
        ].join(" ").toLowerCase();
        return activeCategory === "All" || searchable.includes(activeCategory.toLowerCase());
      })
      .sort((a, b) => (sort === "popular" ? b.likeCount - a.likeCount : 0));
  }, [activeCategory, posts, query, sort]);

  function loadMore() {
    const startingCursor = cursor;
    const startingHasMore = Boolean(hasMore);
    if (!startingCursor || !startingHasMore || isLoadingMore) return;
    setError(null);
    setIsLoadingMore(true);
    void (async () => {
      try {
        let nextCursor: string | null = startingCursor;
        let nextHasMore: boolean = true;
        let additions: HomePost[] = [];

        while (nextCursor && nextHasMore && additions.length === 0) {
          const page = await loadMoreReels(nextCursor);
          const fresh = page.items.filter((post) => !seenIds.current.has(post.id));
          fresh.forEach((post) => seenIds.current.add(post.id));
          additions = fresh;
          nextCursor = page.nextCursor;
          nextHasMore = page.hasNextPage;
        }

        setPosts((current) => [...current, ...additions]);
        setCursor(nextCursor);
        setHasMore(nextHasMore);
      } catch {
        setError("Could not load more videos.");
      } finally {
        setIsLoadingMore(false);
      }
    })();
  }

  return (
    <div className="relative min-h-[calc(100dvh-52px)] overflow-hidden">
      <div className="theme-glow pointer-events-none absolute inset-x-0 top-0 h-[440px] opacity-90" />
      <div className="relative mx-auto max-w-[1320px] px-4 pb-28 pt-5 sm:px-7 lg:px-10 lg:pt-7">
        <div className="grid gap-3 border-b border-line pb-5 lg:grid-cols-[minmax(0,1fr)_320px_auto] lg:items-center">
          <div className="w-full lg:col-start-2 lg:row-start-1 lg:w-[320px]">
            <label className="sr-only" htmlFor="video-search">
              Search videos
            </label>
            <input
              id="video-search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search videos, creators, usernames..."
              className="h-10 w-full rounded-full border border-field-line bg-field px-4 text-sm text-ink outline-none transition placeholder:text-faint focus:border-accent/60"
            />
          </div>

          <div className="flex min-w-0 flex-1 gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden lg:col-start-1 lg:row-start-1 lg:mr-3">
            {categories.map((category) => (
              <button
                key={category}
                type="button"
                onClick={() => setActiveCategory(category)}
                className={`h-10 shrink-0 whitespace-nowrap rounded-full px-4 text-xs font-semibold transition ${
                  activeCategory === category
                    ? "bg-ink text-page"
                    : "bg-soft text-muted hover:bg-accent-soft hover:text-ink"
                }`}
              >
                {category}
              </button>
            ))}
          </div>

          <label className="flex shrink-0 items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-faint lg:col-start-3 lg:row-start-1 lg:justify-self-end">
            Sort by
            <select
              aria-label="Sort videos"
              value={sort}
              onChange={(event) => setSort(event.target.value as SortMode)}
              className="h-9 rounded-xl border border-field-line bg-field px-3 text-xs font-semibold normal-case tracking-normal text-ink outline-none"
            >
              <option value="latest">Latest uploads</option>
              <option value="popular">Most loved</option>
            </select>
          </label>
        </div>

        {isSearching ? (
          <div className="mt-12 flex min-h-[260px] items-center justify-center">
            <div
              role="status"
              aria-label="Searching videos"
              className="flex items-center gap-3 rounded-full border border-line bg-raised px-5 py-3 text-sm font-semibold text-muted"
            >
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-white" />
              Searching videos...
            </div>
          </div>
        ) : visiblePosts.length > 0 ? (
          <div className="mt-8 grid gap-x-5 gap-y-6 sm:grid-cols-2 xl:grid-cols-3">
            {visiblePosts.map((post) => (
              <VideoCard key={post.id} post={post} />
            ))}
          </div>
        ) : (
          <div className="mt-12 rounded-3xl border border-line bg-surface px-6 py-20 text-center">
            <PlayIcon className="mx-auto h-8 w-8 text-accent-ink" />
            <h2 className="mt-5 font-display text-2xl font-bold">No videos found</h2>
            <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-muted">
              Try another video title, creator name, handle, or topic.
            </p>
          </div>
        )}

        {hasMore ? (
          <div className="mt-12 flex justify-center">
            <button
              type="button"
              onClick={loadMore}
              disabled={isLoadingMore}
              className="rounded-full border border-line-strong bg-soft px-6 py-3 text-xs font-bold text-ink transition hover:bg-accent-soft disabled:opacity-50"
            >
              {isLoadingMore ? "Loading more..." : "Show more videos"}
            </button>
          </div>
        ) : null}
        {error ? <p className="mt-3 text-center text-xs text-danger">{error}</p> : null}
      </div>
    </div>
  );
}

function VideoCard({ post }: { post: HomePost }) {
  const media = post.media.find((item) => item.kind === "video");
  const [hovered, setHovered] = useState(false);
  const [muted, setMuted] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(media?.durationSeconds ?? 0);
  const [seekTo, setSeekTo] = useState<number | undefined>(undefined);
  if (!media) return null;

  function handleTimeUpdate(nextTime: number, nextDuration: number) {
    setCurrentTime(nextTime);
    if (nextDuration > 0) setDuration(nextDuration);
  }

  function handleSeek(value: number) {
    setCurrentTime(value);
    setSeekTo(value);
  }

  return (
    <article
      className="group min-w-0 rounded-2xl border border-line-strong/70 bg-raised p-3 shadow-[var(--shadow-card)] transition-all duration-200 hover:border-accent/35 hover:bg-accent-soft"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="relative aspect-video overflow-hidden rounded-xl border border-line bg-raised shadow-[var(--shadow-card)] transition duration-200 group-hover:border-line-strong group-hover:shadow-[0_16px_44px_rgba(0,0,0,0.22)]">
        <VideoMedia
          src={media.url}
          poster={media.posterUrl}
          label={post.caption || `${post.author.name} video`}
          className="h-full w-full bg-raised object-cover"
          autoPlay={hovered}
          muted={muted}
          controls={false}
          loop
          onTimeUpdate={handleTimeUpdate}
          seekTo={seekTo}
        />
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            setMuted((current) => !current);
          }}
          aria-label={muted ? "Turn video sound on" : "Turn video sound off"}
          aria-pressed={!muted}
          className="absolute right-3 top-3 z-10 inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-black/55 text-white opacity-100 backdrop-blur transition hover:bg-black/75"
        >
          <VolumeIcon muted={muted} className="h-[18px] w-[18px]" />
        </button>
        {!hovered ? (
          <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-full border border-white/20 bg-black/55 text-white shadow-xl backdrop-blur">
              <PlayIcon className="ml-0.5 h-5 w-5" />
            </span>
          </span>
        ) : null}
        {hovered ? (
          <input
            type="range"
            min={0}
            max={duration > 0 ? duration : media.durationSeconds ?? 0}
            step={0.1}
            value={Math.min(currentTime, duration || media.durationSeconds || 0)}
            onChange={(event) => handleSeek(Number(event.target.value))}
            aria-label={`Seek ${post.caption || post.author.name} video`}
            className="absolute bottom-3 left-3 z-20 h-1.5 w-[calc(100%-24px)] cursor-pointer accent-white"
          />
        ) : null}
        <span className="pointer-events-none absolute bottom-3 right-3 rounded-md bg-ink/90 px-2 py-1 text-[10px] font-bold text-page">
          {formatDuration(duration > 0 ? duration : media.durationSeconds)}
        </span>
      </div>
      <div className="mt-4 flex gap-3">
        <Avatar name={post.author.name} src={post.author.avatarUrl} size="sm" />
        <div className="min-w-0">
          <h2 className="line-clamp-2 text-sm font-bold leading-5 text-ink">
            {post.caption || "Untitled video"}
          </h2>
          <p className="mt-1 truncate text-xs text-muted">{post.author.name}</p>
          <p className="mt-1 text-[11px] text-faint">
            {formatViews(post)} · {post.createdAtLabel}
          </p>
        </div>
      </div>
    </article>
  );
}
