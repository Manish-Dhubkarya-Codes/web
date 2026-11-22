"use client";

import { useCallback, useRef, useState, useTransition } from "react";

import { formatCount } from "@/lib/format";
import type { HomeFeedPage, HomePost } from "@/lib/home/types";

import { toggleFollowUser, togglePostLike } from "../home/actions";
import { Avatar } from "../home/avatar";
import { CommentsSheet } from "../home/comments-sheet";
import { FeedVideoPlaybackProvider } from "../home/feed-video-playback";
import { CommentIcon, HeartIcon, PlayIcon, VolumeIcon } from "../home/icons";
import { VideoMedia } from "../home/video-media";

export function ReelFeed({
  initialPage,
  selfId,
}: {
  initialPage: HomeFeedPage;
  selfId?: string;
}) {
  const [posts] = useState(initialPage.items);

  if (posts.length === 0) {
    return (
      <div className="flex h-dvh flex-col items-center justify-center bg-black px-6 text-center">
        <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-white/40">
          Inn
        </p>
        <h1 className="mt-3 font-display text-2xl font-bold text-white">No Inns yet</h1>
        <p className="mt-2 max-w-sm text-sm leading-6 text-white/55">
          Short videos from the community will appear here.
        </p>
      </div>
    );
  }

  return (
    <FeedVideoPlaybackProvider>
      <div className="h-[calc(100dvh-57px)] snap-y snap-mandatory overflow-y-auto bg-black [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:h-[calc(100dvh-57px)] sm:bg-[#09090b]">
        {posts.map((post) => (
          <ReelSlide key={post.id} post={post} isOwn={Boolean(selfId && post.author.id === selfId)} />
        ))}
      </div>
    </FeedVideoPlaybackProvider>
  );
}

function ReelSlide({ post, isOwn }: { post: HomePost; isOwn: boolean }) {
  const media = post.media[0];
  const [liked, setLiked] = useState(post.isLiked);
  const [likeCount, setLikeCount] = useState(post.likeCount);
  const [commentCount, setCommentCount] = useState(post.commentCount);
  const [following, setFollowing] = useState(post.isFollowingAuthor);
  const [muted, setMuted] = useState(false);
  const [paused, setPaused] = useState(false);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [isLiking, startLike] = useTransition();
  const [isFollowing, startFollow] = useTransition();
  const likePendingRef = useRef(false);
  const handleCommentsLoaded = useCallback((count: number) => {
    setCommentCount((current) => Math.max(current, count));
  }, []);

  function handleLike() {
    if (likePendingRef.current) return;
    const next = !liked;
    likePendingRef.current = true;
    setLiked(next);
    setLikeCount((count) => Math.max(0, count + (next ? 1 : -1)));

    startLike(async () => {
      try {
        await togglePostLike(post.contentId, next, "reel");
      } catch {
        setLiked(!next);
        setLikeCount((count) => Math.max(0, count + (next ? -1 : 1)));
      } finally {
        likePendingRef.current = false;
      }
    });
  }

  function handleFollow() {
    if (!post.author.id || isFollowing) return;
    const next = !following;
    setFollowing(next);

    startFollow(async () => {
      try {
        await toggleFollowUser(post.author.id, next);
      } catch {
        setFollowing(!next);
      }
    });
  }

  if (!media) return null;

  return (
    <article className="relative flex h-full snap-start items-center justify-center overflow-hidden bg-black sm:bg-[#09090b] sm:py-3">
      <div className="relative h-full w-full overflow-hidden bg-black sm:h-[calc(100dvh-81px)] sm:w-[min(390px,calc((100dvh-81px)*9/16))] sm:rounded-[14px] sm:border sm:border-white/10 sm:shadow-[0_20px_70px_rgba(0,0,0,0.55)]">
        <VideoMedia
          src={media.url}
          poster={media.posterUrl}
          label={`Inn from ${post.author.name}`}
          className="h-full w-full bg-black object-contain"
          autoPlayInView
          muted={muted}
          controls={false}
          loop
          onPlaybackChange={setPaused}
        />

        {paused ? (
          <div
            aria-hidden
            className="pointer-events-none absolute left-1/2 top-1/2 z-10 inline-flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-black/45 text-white backdrop-blur"
          >
            <PlayIcon className="h-7 w-7 translate-x-0.5" />
          </div>
        ) : null}

        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/90 via-black/10 to-black/25"
        />

        <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-center justify-between p-4 pt-[calc(env(safe-area-inset-top)+12px)]">
          <span className="rounded-full border border-white/15 bg-black/35 px-3 py-1 text-[9px] font-bold uppercase tracking-[0.2em] text-white/85 backdrop-blur">
            Inn
          </span>
        </div>

        <div className="absolute inset-x-0 bottom-0 z-10 flex items-end gap-3 p-3 pb-[calc(env(safe-area-inset-bottom)+14px)] sm:p-4 sm:pb-5">
          <div className="min-w-0 flex-1 pr-1 text-white">
            <div className="flex items-center gap-2">
              <Avatar name={post.author.name} src={post.author.avatarUrl} size="sm" />
              <div className="min-w-0">
                <p className="truncate text-[13px] font-bold drop-shadow">{post.author.name}</p>
                {post.author.handle ? (
                  <p className="truncate text-[11px] text-white/70">@{post.author.handle}</p>
                ) : null}
              </div>

              {!isOwn ? (
                <button
                  type="button"
                  onClick={handleFollow}
                  disabled={isFollowing}
                  aria-busy={isFollowing}
                  aria-label={following ? `Unfollow ${post.author.name}` : `Follow ${post.author.name}`}
                  aria-pressed={following}
                  className={`ml-1 shrink-0 rounded-full border px-3 py-1.5 text-[10px] font-bold backdrop-blur transition disabled:cursor-wait disabled:opacity-70 ${
                    following
                      ? "border-white/20 bg-black/35 text-white/80"
                      : "border-white/90 bg-white text-black"
                  }`}
                >
                  {following ? "Following" : "Follow"}
                </button>
              ) : null}
            </div>

            {post.caption ? (
              <p className="mt-2 line-clamp-2 max-w-[315px] text-[12px] leading-[18px] text-white/90 drop-shadow">
                {post.caption}
              </p>
            ) : null}
          </div>

          <div className="flex shrink-0 flex-col items-center gap-3">
          <button
            type="button"
            onClick={handleLike}
            disabled={isLiking}
            aria-label={liked ? "Unlike Inn" : "Like Inn"}
            aria-pressed={liked}
            className="flex flex-col items-center gap-1 text-white transition disabled:cursor-wait disabled:opacity-70"
          >
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-black/35 backdrop-blur">
              <HeartIcon filled={liked} className={`h-5 w-5 ${liked ? "text-rose-400" : "text-white"}`} />
            </span>
            <span className="text-[10px] font-semibold drop-shadow">{formatCount(likeCount)}</span>
          </button>

          <button
            type="button"
            onClick={() => setCommentsOpen(true)}
            aria-label="View comments"
            className="flex flex-col items-center gap-1 text-white"
          >
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-black/35 backdrop-blur">
              <CommentIcon className="h-5 w-5" />
            </span>
            <span className="text-[10px] font-semibold drop-shadow">{formatCount(commentCount)}</span>
          </button>

          <button
            type="button"
            onClick={() => setMuted((current) => !current)}
            aria-label={muted ? "Turn sound on" : "Turn sound off"}
            aria-pressed={!muted}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-black/35 text-white backdrop-blur"
          >
            <VolumeIcon muted={muted} className="h-[18px] w-[18px]" />
          </button>
          </div>
        </div>

        {commentsOpen ? (
          <CommentsSheet
            contentId={post.contentId}
            contentKind="reel"
            expectedCount={commentCount}
            onClose={() => setCommentsOpen(false)}
            onAdded={() => setCommentCount((count) => count + 1)}
            onLoaded={handleCommentsLoaded}
          />
        ) : null}
      </div>
    </article>
  );
}
