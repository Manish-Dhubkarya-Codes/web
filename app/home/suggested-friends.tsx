"use client";

import { useState } from "react";

import type { HomeAuthor } from "@/lib/home/types";

import { toggleFollowUser } from "./actions";
import { Avatar } from "./avatar";

export function SuggestedFriends({ users }: { users: HomeAuthor[] }) {
  const [following, setFollowing] = useState<Record<string, boolean>>({});
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (users.length === 0) return null;

  async function handleToggle(user: HomeAuthor) {
    if (pendingId) return;

    const nextFollowing = !following[user.id];
    setFollowing((current) => ({ ...current, [user.id]: nextFollowing }));
    setPendingId(user.id);
    setError(null);

    try {
      await toggleFollowUser(user.id, nextFollowing);
      window.dispatchEvent(
        new CustomEvent("vuinn:follow-changed", {
          detail: { userId: user.id, following: nextFollowing },
        }),
      );
    } catch {
      setFollowing((current) => ({ ...current, [user.id]: !nextFollowing }));
      setError("Couldn't update follow. Try again.");
    } finally {
      setPendingId(null);
    }
  }

  return (
    <section aria-labelledby="suggested-people-title" className="px-1">
      <h2
        id="suggested-people-title"
        className="mb-3 text-[13px] font-semibold text-ink"
      >
        Suggested for you
      </h2>

      <ul className="space-y-1">
        {users.map((user) => {
          const isFollowing = Boolean(following[user.id]);
          const isPending = pendingId === user.id;

          return (
            <li key={user.id} className="flex items-center gap-3 py-2">
              <Avatar
                name={user.name}
                src={user.avatarUrl}
                size="lg"
                online={user.isOnline}
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[12.5px] font-semibold text-ink">{user.name}</p>
                <p className="truncate text-[11px] text-muted">Suggested for you</p>
              </div>
              <button
                type="button"
                onClick={() => void handleToggle(user)}
                disabled={isPending}
                aria-busy={isPending}
                aria-pressed={isFollowing}
                aria-label={`${isFollowing ? "Unfollow" : "Follow"} ${user.name}`}
                title={`${isFollowing ? "Unfollow" : "Follow"} ${user.name}`}
                className={`shrink-0 text-[11.5px] font-semibold transition disabled:cursor-wait disabled:opacity-60 ${
                  isFollowing ? "text-muted hover:text-ink" : "text-accent hover:text-accent/80"
                }`}
              >
                {isFollowing ? "Following" : "Follow"}
              </button>
            </li>
          );
        })}
      </ul>

      {error ? (
        <p role="status" aria-live="polite" className="px-1 pt-2 text-[10.5px] text-faint">
          {error}
        </p>
      ) : null}
    </section>
  );
}
