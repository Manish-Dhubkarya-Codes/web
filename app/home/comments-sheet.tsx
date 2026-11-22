"use client";

import { useEffect, useRef, useState, useTransition } from "react";

import { formatCount } from "@/lib/format";
import type { HomeComment, HomeContentKind } from "@/lib/home/types";

import { createPostCommentAction, loadPostComments, toggleCommentLike } from "./actions";
import { Avatar } from "./avatar";
import { CloseIcon, HeartIcon, SendIcon } from "./icons";

interface ThreadedComment {
  comment: HomeComment;
  isReply: boolean;
}

function threadComments(comments: HomeComment[]): ThreadedComment[] {
  const knownIds = new Set(comments.map((comment) => comment.id));
  const repliesByParent = new Map<string, HomeComment[]>();
  const topLevel: HomeComment[] = [];

  for (const comment of comments) {
    if (comment.parentCommentId && knownIds.has(comment.parentCommentId)) {
      const bucket = repliesByParent.get(comment.parentCommentId);
      if (bucket) bucket.push(comment);
      else repliesByParent.set(comment.parentCommentId, [comment]);
    } else {
      topLevel.push(comment);
    }
  }

  const threaded: ThreadedComment[] = [];
  for (const comment of topLevel) {
    threaded.push({ comment, isReply: false });
    for (const reply of repliesByParent.get(comment.id) ?? []) {
      threaded.push({ comment: reply, isReply: true });
    }
  }
  return threaded;
}

export function CommentsSheet({
  contentId,
  contentKind,
  expectedCount = 0,
  onClose,
  onAdded,
  onLoaded,
}: {
  contentId: string;
  contentKind: HomeContentKind;
  expectedCount?: number;
  onClose: () => void;
  onAdded: () => void;
  onLoaded?: (count: number) => void;
}) {
  const [comments, setComments] = useState<HomeComment[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [replyTarget, setReplyTarget] = useState<HomeComment | null>(null);
  const [isSending, startSend] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);
  const expectedCountRef = useRef(expectedCount);
  const pendingLikesRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

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
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  useEffect(() => {
    let cancelled = false;

    loadPostComments(contentId, contentKind, expectedCountRef.current)
      .then((items) => {
        if (!cancelled) {
          setComments(items);
          onLoaded?.(items.length);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setComments([]);
          setError("Couldn't load comments.");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [contentId, contentKind, onLoaded]);

  function focusInput() {
    requestAnimationFrame(() => inputRef.current?.focus());
  }

  function beginReply(comment: HomeComment) {
    setReplyTarget(comment);
    setText(`@${comment.author.name} `);
    setError(null);
    focusInput();
  }

  function cancelReply() {
    setReplyTarget(null);
    setText("");
    setError(null);
    focusInput();
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = text.trim();
    if (!trimmed || isSending) return;

    setError(null);
    const parentCommentId = replyTarget?.id ?? null;

    startSend(async () => {
      try {
        const comment = await createPostCommentAction(
          contentId,
          trimmed,
          contentKind,
          parentCommentId,
        );
        setComments((current) => [...(current ?? []), comment]);
        setText("");
        setReplyTarget(null);
        onAdded();
        focusInput();
      } catch {
        setError("Couldn't post your comment.");
      }
    });
  }

  function handleCommentLike(comment: HomeComment) {
    if (pendingLikesRef.current.has(comment.id)) return;

    const nextLiked = !comment.isLiked;
    const previousLiked = comment.isLiked;
    const previousCount = comment.likeCount;

    pendingLikesRef.current.add(comment.id);
    setError(null);
    setComments((current) =>
      current?.map((item) =>
        item.id === comment.id
          ? {
              ...item,
              isLiked: nextLiked,
              likeCount: Math.max(0, item.likeCount + (nextLiked ? 1 : -1)),
            }
          : item,
      ) ?? current,
    );

    void toggleCommentLike(comment.id, nextLiked, contentKind)
      .catch(() => {
        setComments((current) =>
          current?.map((item) =>
            item.id === comment.id
              ? { ...item, isLiked: previousLiked, likeCount: previousCount }
              : item,
          ) ?? current,
        );
        setError("Couldn't update the comment like.");
      })
      .finally(() => {
        pendingLikesRef.current.delete(comment.id);
      });
  }

  const threadedComments = threadComments(comments ?? []);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 backdrop-blur-sm sm:items-center sm:p-6"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="comments-title"
        className="flex max-h-[88dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl border border-line bg-surface shadow-2xl sm:rounded-3xl"
      >
        <header className="flex items-center justify-between border-b border-line px-5 py-4">
          <div>
            <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-faint">Conversation</p>
            <h2 id="comments-title" className="mt-0.5 font-display text-lg font-bold text-ink">
              Comments
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close comments"
            className="rounded-full border border-line p-2 text-muted transition hover:text-ink"
          >
            <CloseIcon className="h-4 w-4" />
          </button>
        </header>

        <div className="min-h-[180px] flex-1 overflow-y-auto px-5 py-4">
          {comments === null ? (
            <div className="flex items-center justify-center gap-2 py-10 text-xs text-muted">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-line border-t-accent" />
              Loading comments…
            </div>
          ) : comments.length === 0 ? (
            <div className="py-10 text-center">
              <p className="text-sm font-semibold text-ink">No comments yet</p>
              <p className="mt-1 text-xs text-muted">Start the conversation.</p>
            </div>
          ) : (
            <ul className="space-y-4">
              {threadedComments.map(({ comment, isReply }) => {
                const replyingToThis = replyTarget?.id === comment.id;
                return (
                  <li
                    key={comment.id}
                    className={`flex gap-3 rounded-2xl transition ${
                      replyingToThis ? "bg-accent/5 ring-1 ring-accent/15" : ""
                    } ${isReply ? "ml-9 sm:ml-11" : ""}`}
                  >
                    <Avatar
                      name={comment.author.name}
                      src={comment.author.avatarUrl}
                      size={isReply ? "xs" : "sm"}
                    />
                    <div className="min-w-0 flex-1 py-1">
                      <p className="text-[12px] font-semibold text-ink">
                        {comment.author.name}
                        {comment.createdAtLabel ? (
                          <span className="ml-2 font-normal text-faint">{comment.createdAtLabel}</span>
                        ) : null}
                      </p>
                      <p className="mt-0.5 whitespace-pre-wrap break-words text-[13px] leading-5 text-body">
                        {comment.text}
                      </p>
                      <div className="mt-1.5 flex items-center gap-4">
                        <button
                          type="button"
                          onClick={() => handleCommentLike(comment)}
                          aria-label={comment.isLiked ? "Unlike comment" : "Like comment"}
                          aria-pressed={comment.isLiked}
                          className={`inline-flex items-center gap-1 text-[11px] font-semibold transition ${
                            comment.isLiked ? "text-danger" : "text-faint hover:text-muted"
                          }`}
                        >
                          <HeartIcon
                            filled={comment.isLiked}
                            className="h-3.5 w-3.5"
                          />
                          {comment.likeCount > 0 ? <span>{formatCount(comment.likeCount)}</span> : null}
                        </button>
                        <button
                          type="button"
                          onClick={() => beginReply(comment)}
                          className="text-[11px] font-semibold text-faint transition hover:text-ink"
                        >
                          Reply
                        </button>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <form onSubmit={handleSubmit} className="border-t border-line bg-surface px-4 py-3">
          {error ? (
            <p role="alert" className="mb-2 text-[11px] text-red-500">
              {error}
            </p>
          ) : null}
          {replyTarget ? (
            <div className="mb-2 flex items-center justify-between gap-3 rounded-xl bg-accent/5 px-3 py-1.5 text-[11px] text-muted ring-1 ring-accent/15">
              <span className="min-w-0 truncate">
                Replying to <span className="font-semibold text-ink">{replyTarget.author.name}</span>
              </span>
              <button
                type="button"
                onClick={cancelReply}
                className="shrink-0 font-semibold text-accent transition hover:text-accent-ink"
              >
                Cancel
              </button>
            </div>
          ) : null}
          <div className="flex items-center gap-2">
            <input
              ref={inputRef}
              value={text}
              onChange={(event) => setText(event.target.value)}
              maxLength={500}
              placeholder={replyTarget ? `Reply to ${replyTarget.author.name}…` : "Add a comment…"}
              disabled={isSending}
              className="min-w-0 flex-1 rounded-full border border-line bg-page px-4 py-2.5 text-[13px] text-ink outline-none transition placeholder:text-faint focus:border-accent/50 disabled:opacity-60"
            />
            <button
              type="submit"
              disabled={!text.trim() || isSending}
              aria-label={replyTarget ? "Post reply" : "Post comment"}
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-ink text-page transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {isSending ? (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-page/30 border-t-page" />
              ) : (
                <SendIcon className="h-4 w-4" />
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
