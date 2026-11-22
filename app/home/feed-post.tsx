"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";

import { formatCount } from "@/lib/format";
import type { HomePost } from "@/lib/home/types";

import { sharePost, toggleFollowUser, togglePostLike, togglePostSave } from "./actions";
import { Avatar } from "./avatar";
import { CommentsSheet } from "./comments-sheet";
import { BookmarkIcon, CommentIcon, HeartIcon, PlayIcon, ShareIcon } from "./icons";
import { VideoMedia } from "./video-media";

export function PostCard({
  post,
  onFollowChange,
}: {
  post: HomePost;
  onFollowChange?: (authorId: string, following: boolean) => void;
}) {
  const [liked, setLiked] = useState(post.isLiked);
  const [likeCount, setLikeCount] = useState(post.likeCount);
  const [saved, setSaved] = useState(post.isSaved);
  const [following, setFollowing] = useState(post.isFollowingAuthor);
  const [commentCount, setCommentCount] = useState(post.commentCount);
  const [shareCount, setShareCount] = useState(post.shareCount);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const followTouchedRef = useRef(false);
  const [isLiking, startLike] = useTransition();
  const likePendingRef = useRef(false);
  const [isSaving, startSave] = useTransition();
  const [isFollowing, startFollow] = useTransition();

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), 3200);
    return () => clearTimeout(timer);
  }, [notice]);

  useEffect(() => {
    if (!followTouchedRef.current) setFollowing(post.isFollowingAuthor);
  }, [post.isFollowingAuthor]);

  const handleCommentsLoaded = useCallback((count: number) => {
    setCommentCount((current) => Math.max(current, count));
  }, []);

  function setPostLike(next: boolean) {
    if (likePendingRef.current || liked === next) return;
    likePendingRef.current = true;
    setLiked(next);
    setLikeCount((count) => Math.max(0, count + (next ? 1 : -1)));
    setNotice(null);

    startLike(async () => {
      try {
        await togglePostLike(post.contentId, next, post.contentKind);
      } catch {
        setLiked(!next);
        setLikeCount((count) => Math.max(0, count + (next ? -1 : 1)));
        setNotice("Couldn't update your like.");
      } finally {
        likePendingRef.current = false;
      }
    });
  }

  function handleLike() {
    setPostLike(!liked);
  }

  function handleMediaDoubleTapLike() {
    setPostLike(true);
  }

  function handleSave() {
    if (isSaving) return;
    const next = !saved;
    setSaved(next);
    setNotice(null);

    startSave(async () => {
      try {
        await togglePostSave(post.contentId, next, post.contentKind);
      } catch {
        setSaved(!next);
        setNotice("Couldn't update your saved posts.");
      }
    });
  }

  function handleFollow() {
    if (!post.author.id || isFollowing) return;
    const next = !following;
    followTouchedRef.current = true;
    setFollowing(next);
    onFollowChange?.(post.author.id, next);
    setNotice(null);

    startFollow(async () => {
      try {
        await toggleFollowUser(post.author.id, next);
      } catch {
        setFollowing(!next);
        onFollowChange?.(post.author.id, !next);
        setNotice("Couldn't update follow.");
      }
    });
  }

  async function handleShare() {
    const shareUrl = `https://vuinn.com/?s=${post.contentKind}&id=${encodeURIComponent(post.contentId)}`;
    const shareData = {
      title: `${post.author.name} on VuInn`,
      text: post.caption.slice(0, 140),
      url: shareUrl,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareUrl);
        setNotice("Link copied.");
      } else {
        window.prompt("Copy this link", shareUrl);
      }

      setShareCount((count) => count + 1);
      void sharePost(post.contentId, post.contentKind).catch(() => undefined);
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setNotice("Couldn't share this post.");
    }
  }

  const commentsLabel = commentCount === 1 ? "comment" : "comments";
  const hasComments = commentCount > 0 || post.commentsPreview.length > 0;

  return (
    <article className="overflow-hidden rounded-3xl border border-line bg-surface shadow-[0_18px_50px_-32px_rgba(0,0,0,0.45)]">
      <header className="flex items-center gap-3 px-4 py-3.5 sm:px-5">
        <Avatar
          name={post.author.name}
          src={post.author.avatarUrl}
          online={post.author.isOnline}
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13.5px] font-semibold text-ink">{post.author.name}</p>
        </div>
        {post.author.id ? (
          <button
            type="button"
            onClick={handleFollow}
            disabled={isFollowing}
            aria-busy={isFollowing}
            aria-label={following ? `Unfollow ${post.author.name}` : `Follow ${post.author.name}`}
            title={following ? `Unfollow ${post.author.name}` : `Follow ${post.author.name}`}
            aria-pressed={following}
            className={`shrink-0 rounded-full border px-3.5 py-1.5 text-[11px] font-bold transition disabled:cursor-wait disabled:opacity-60 ${
              following
                ? "border-line text-muted hover:border-danger/30 hover:text-danger"
                : "border-accent/30 bg-accent/10 text-accent hover:bg-accent/15"
            }`}
          >
            {following ? "Following" : "Follow"}
          </button>
        ) : null}
      </header>

      <PostMedia post={post} onDoubleTapLike={handleMediaDoubleTapLike} />

      <div className="flex items-center gap-0.5 px-2 py-2 sm:px-3">
        <ActionButton
          label={liked ? "Unlike" : "Like"}
          active={liked}
          count={likeCount}
          disabled={isLiking}
          onClick={handleLike}
          icon={<HeartIcon filled={liked} />}
        />
        <ActionButton
          label="Comments"
          count={commentCount}
          onClick={() => setCommentsOpen(true)}
          icon={<CommentIcon />}
        />
        <ActionButton
          label="Share"
          count={shareCount}
          onClick={handleShare}
          icon={<ShareIcon />}
        />
        <div className="flex-1" />
        <ActionButton
          label={saved ? "Remove from saved" : "Save"}
          active={saved}
          disabled={isSaving}
          onClick={handleSave}
          icon={<BookmarkIcon filled={saved} />}
        />
      </div>

      {post.caption ? (
        <p className="px-4 pb-2 pt-0.5 text-[13.5px] leading-6 text-body sm:px-5">
          <span className="font-semibold text-ink">{post.author.name}</span> {post.caption}
        </p>
      ) : null}

      {post.commentsPreview.length > 0 ? (
        <div className="space-y-1 px-4 pb-2.5 sm:px-5">
          {post.commentsPreview.map((comment) => (
            <p key={comment.id} className="line-clamp-1 text-[12.5px] leading-5 text-body">
              <span className="font-semibold text-ink">{comment.author.name}</span>{" "}
              {comment.text}
            </p>
          ))}
        </div>
      ) : null}

      <p className="px-4 pb-2.5 pt-1 text-[11px] text-muted sm:px-5">
        {post.author.handle ? `@${post.author.handle}` : "VuInn creator"}
        {post.location ? (
          <>
            <span aria-hidden> · </span>
            <span className="font-medium text-accent">{post.location}</span>
          </>
        ) : null}
        {post.createdAtLabel ? (
          <>
            <span aria-hidden> · </span>
            {post.createdAtLabel}
          </>
        ) : null}
      </p>

      <div className="flex items-center justify-between gap-3 px-4 pb-4 sm:px-5">
        <button
          type="button"
          onClick={() => setCommentsOpen(true)}
          className="min-w-0 text-left text-[11.5px] font-semibold text-muted transition hover:text-ink"
        >
          {hasComments
            ? commentCount > 0
              ? `View all ${formatCount(commentCount)} ${commentsLabel}`
              : "View comments"
            : "Add a comment"}
        </button>
        {notice ? (
          <p role="status" aria-live="polite" className="max-w-[170px] truncate text-[10.5px] text-faint">
            {notice}
          </p>
        ) : null}
      </div>

      {commentsOpen ? (
        <CommentsSheet
          contentId={post.contentId}
          contentKind={post.contentKind}
          expectedCount={commentCount}
          onClose={() => setCommentsOpen(false)}
          onAdded={() => setCommentCount((count) => count + 1)}
          onLoaded={handleCommentsLoaded}
        />
      ) : null}
    </article>
  );
}

function PostMedia({
  post,
  onDoubleTapLike,
}: {
  post: HomePost;
  onDoubleTapLike: () => void;
}) {
  const media = post.media[0];
  const lastTapRef = useRef(0);
  const pointerStartRef = useRef<{ x: number; y: number } | null>(null);
  if (!media) return null;

  function handlePointerDown(event: React.PointerEvent<HTMLDivElement>) {
    if (event.pointerType === "mouse") return;
    pointerStartRef.current = { x: event.clientX, y: event.clientY };
  }

  function handlePointerUp(event: React.PointerEvent<HTMLDivElement>) {
    // dblclick covers mice; touch browsers do not consistently emit it.
    if (event.pointerType === "mouse") return;
    const start = pointerStartRef.current;
    pointerStartRef.current = null;

    // A scroll/drag is a pointer-up too, but it must never count as a tap.
    if (start && (Math.abs(event.clientX - start.x) > 12 || Math.abs(event.clientY - start.y) > 12)) {
      lastTapRef.current = 0;
      return;
    }

    const now = Date.now();
    if (now - lastTapRef.current <= 320) {
      lastTapRef.current = 0;
      onDoubleTapLike();
    } else {
      lastTapRef.current = now;
    }
  }

  return (
    <div
      className="relative touch-manipulation select-none bg-black"
      onDoubleClick={onDoubleTapLike}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
    >
      {media.kind === "video" ? (
        <VideoMedia
          src={media.url}
          poster={media.posterUrl}
          label={`Video from ${post.author.name}`}
          autoPlayInView
          muted
        />
      ) : (
        <img
          src={media.url}
          alt={post.caption || `Post from ${post.author.name}`}
          loading="lazy"
          decoding="async"
          draggable={false}
          className="max-h-[680px] min-h-[220px] w-full object-contain"
        />
      )}

      {media.kind === "video" ? (
        <span
          aria-hidden
          className="pointer-events-none absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-black/65 px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.16em] text-white backdrop-blur"
        >
          <PlayIcon className="h-3 w-3" />
          Video
        </span>
      ) : null}

      {post.media.length > 1 ? (
        <span className="pointer-events-none absolute right-3 top-3 rounded-full bg-black/65 px-2.5 py-1 text-[10px] font-bold text-white backdrop-blur">
          +{post.media.length - 1}
        </span>
      ) : null}
    </div>
  );
}

function ActionButton({
  label,
  icon,
  count,
  active,
  disabled = false,
  onClick,
}: {
  label: string;
  icon: React.ReactNode;
  count?: number;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      aria-pressed={typeof active === "boolean" ? active : undefined}
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-2 text-[12px] font-semibold transition disabled:cursor-wait disabled:opacity-60 ${
        active ? "text-accent" : "text-muted hover:text-ink"
      }`}
    >
      <span className="[&>svg]:h-[21px] [&>svg]:w-[21px]">{icon}</span>
      {typeof count === "number" && count > 0 ? <span>{formatCount(count)}</span> : null}
    </button>
  );
}
