"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";

import type { HomeFeedPage } from "@/lib/home/types";

import { loadFollowingIds, loadMorePosts } from "./actions";
import { FeedVideoPlaybackProvider } from "./feed-video-playback";
import { PostCard } from "./feed-post";

export function HomeFeed({ initialPage }: { initialPage: HomeFeedPage }) {
  const [posts, setPosts] = useState(initialPage.items);
  const [cursor, setCursor] = useState(initialPage.nextCursor);
  const [hasMore, setHasMore] = useState(initialPage.hasNextPage);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, startLoading] = useTransition();
  const sentinelRef = useRef<HTMLDivElement>(null);
  const inFlightRef = useRef(false);
  const seenIdsRef = useRef(new Set(initialPage.items.map((post) => post.id)));
  const followingIdsRef = useRef<Set<string> | null>(null);
  const followDecisionsRef = useRef(new Map<string, boolean>());

  useEffect(() => {
    let cancelled = false;

    loadFollowingIds()
      .then((ids) => {
        if (cancelled) return;
        const following = new Set(ids);
        followingIdsRef.current = following;
        setPosts((current) =>
          current.map((post) => {
            const decided = followDecisionsRef.current.get(post.author.id);
            const isFollowingAuthor = decided ?? following.has(post.author.id);
            return post.isFollowingAuthor === isFollowingAuthor
              ? post
              : { ...post, isFollowingAuthor };
          }),
        );
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, []);

  const handleFollowChange = useCallback((authorId: string, followingAuthor: boolean) => {
    followDecisionsRef.current.set(authorId, followingAuthor);
    if (followingIdsRef.current) {
      if (followingAuthor) followingIdsRef.current.add(authorId);
      else followingIdsRef.current.delete(authorId);
    }
    setPosts((current) =>
      current.map((post) =>
        post.author.id === authorId && post.isFollowingAuthor !== followingAuthor
          ? { ...post, isFollowingAuthor: followingAuthor }
          : post,
      ),
    );
  }, []);

  useEffect(() => {
    function handleExternalFollowChange(event: Event) {
      const detail = (event as CustomEvent<{ userId?: string; following?: boolean }>).detail;
      if (!detail?.userId || typeof detail.following !== "boolean") return;
      handleFollowChange(detail.userId, detail.following);
    }

    window.addEventListener("vuinn:follow-changed", handleExternalFollowChange);
    return () => window.removeEventListener("vuinn:follow-changed", handleExternalFollowChange);
  }, [handleFollowChange]);

  const loadMore = useCallback(() => {
    if (!hasMore || !cursor || inFlightRef.current) return;

    inFlightRef.current = true;
    setError(null);

    startLoading(async () => {
      try {
        const page = await loadMorePosts(cursor);
        const knownFollowing = followingIdsRef.current;
        const fresh = page.items
          .filter((post) => !seenIdsRef.current.has(post.id))
          .map((post) => {
            if (!knownFollowing) return post;
            const decided = followDecisionsRef.current.get(post.author.id);
            const isFollowingAuthor = decided ?? knownFollowing.has(post.author.id);
            return post.isFollowingAuthor === isFollowingAuthor
              ? post
              : { ...post, isFollowingAuthor };
          });
        for (const post of fresh) seenIdsRef.current.add(post.id);

        setPosts((current) => [...current, ...fresh]);

        const canContinue =
          page.hasNextPage &&
          Boolean(page.nextCursor) &&
          page.nextCursor !== cursor &&
          fresh.length > 0;

        setCursor(canContinue ? page.nextCursor : null);
        setHasMore(canContinue);
      } catch {
        setError("Couldn't load more posts.");
      } finally {
        inFlightRef.current = false;
      }
    });
  }, [cursor, hasMore]);

  useEffect(() => {
    const node = sentinelRef.current;
    if (!node || !hasMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) loadMore();
      },
      { rootMargin: "700px 0px" },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [hasMore, loadMore]);

  if (posts.length === 0) {
    return (
      <div className="rounded-3xl border border-line bg-surface px-6 py-14 text-center shadow-sm">
        <p className="text-[9px] font-semibold uppercase tracking-[0.22em] text-faint">
          Nothing here yet
        </p>
        <h2 className="mt-3 font-display text-2xl font-bold text-ink">Your feed is quiet</h2>
        <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-muted">
          Follow creators or check back soon. New posts from people you follow will show up here.
        </p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="mt-5 inline-flex rounded-full bg-ink px-4 py-2 text-xs font-bold text-page transition hover:opacity-90"
        >
          Refresh feed
        </button>
      </div>
    );
  }

  return (
    <FeedVideoPlaybackProvider>
      <div className="space-y-4 sm:space-y-5">
        {posts.map((post) => (
          <PostCard key={post.id} post={post} onFollowChange={handleFollowChange} />
        ))}

        <div ref={sentinelRef} aria-hidden className="h-1" />

        {isLoading ? (
          <div role="status" aria-live="polite" className="flex items-center justify-center gap-2 py-6 text-xs text-muted">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-line border-t-accent" />
            Loading more posts…
          </div>
        ) : null}

        {error ? (
          <div className="flex flex-col items-center gap-2 py-5 text-center">
            <p className="text-xs text-muted">{error}</p>
            <button
              type="button"
              onClick={loadMore}
              className="rounded-full border border-line bg-surface px-4 py-2 text-xs font-bold text-ink transition hover:border-accent/40"
            >
              Try again
            </button>
          </div>
        ) : null}

        {!hasMore && !isLoading ? (
          <p className="py-6 text-center text-[11px] font-medium uppercase tracking-[0.18em] text-faint">
            You&apos;re all caught up
          </p>
        ) : null}
      </div>
    </FeedVideoPlaybackProvider>
  );
}
