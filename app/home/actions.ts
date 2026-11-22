"use server";

import { revalidatePath } from "next/cache";

import type { HomeContentKind } from "@/lib/home/types";
import { ApiError, apiDelete, apiPost } from "@/lib/server/api";
import { getSessionUser } from "@/lib/server/auth";
import {
  createPostComment,
  getFollowingIds,
  getHomeFeed,
  getHomeReels,
  getPostComments,
} from "@/lib/server/home";

function engagementCollection(contentKind: HomeContentKind): string {
  return contentKind === "reel" ? "ReelEngagement" : "PostEngagement";
}

function isAlreadyInState(error: unknown, nextFollowing: boolean): boolean {
  if (!(error instanceof ApiError)) return false;
  if (error.status === 409) return true;
  if (nextFollowing) {
    return error.status === 400 && /already|following/i.test(error.message);
  }
  return (
    (error.status === 400 || error.status === 404) && /not\s+following/i.test(error.message)
  );
}

function readApiFailure(payload: unknown): string | null {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return null;
  const body = payload as Record<string, unknown>;
  if (body.success !== false && body.status !== false) return null;
  return typeof body.message === "string" && body.message.trim()
    ? body.message.trim()
    : "VuInn rejected the request.";
}

export async function loadMorePosts(cursor: string) {
  return getHomeFeed(cursor);
}

export async function loadMoreReels(cursor: string) {
  return getHomeReels(cursor);
}

export async function searchReels(query: string) {
  const normalizedQuery = query.trim();
  if (!normalizedQuery) return getHomeReels();

  const seen = new Set<string>();
  const matches: Awaited<ReturnType<typeof getHomeReels>>["items"] = [];
  let cursor: string | null = null;
  let hasNextPage = true;
  let pageCount = 0;
  const maxPages = 5;
  const terms = normalizedQuery
    .normalize("NFKC")
    .toLowerCase()
    .replace(/^@/, "")
    .split(/\s+/)
    .filter(Boolean);

  while (hasNextPage && pageCount < maxPages) {
    const page = await getHomeReels(cursor, pageCount === 0 ? normalizedQuery : null);
    pageCount += 1;
    let matchedOnPage = false;

    for (const post of page.items) {
      if (seen.has(post.id)) continue;
      seen.add(post.id);

      const searchable = [
        post.caption,
        post.author.name,
        post.author.handle ? `@${post.author.handle}` : "",
        post.author.handle ?? "",
        post.author.id,
        post.location ?? "",
      ]
        .join(" ")
        .normalize("NFKC")
        .toLowerCase();
      if (terms.some((term) => searchable.includes(term))) {
        matches.push(post);
        matchedOnPage = true;
      }
    }

    cursor = page.nextCursor;
    hasNextPage = Boolean(page.hasNextPage && cursor);

    if (pageCount === 1 && matchedOnPage) break;
  }

  return {
    items: matches,
    nextCursor: null,
    hasNextPage: false,
  } satisfies Awaited<ReturnType<typeof getHomeReels>>;
}

export async function togglePostLike(
  contentId: string,
  nextLiked: boolean,
  contentKind: HomeContentKind = "post",
) {
  const path = `social/${engagementCollection(contentKind)}/${encodeURIComponent(contentId)}/like`;
  if (nextLiked) {
    await apiPost(path);
  } else {
    await apiDelete(path);
  }
  revalidatePath("/home");
  return { ok: true } as const;
}

export async function togglePostSave(
  contentId: string,
  nextSaved: boolean,
  contentKind: HomeContentKind = "post",
) {
  const path = `social/${engagementCollection(contentKind)}/${encodeURIComponent(contentId)}/save`;
  if (nextSaved) {
    await apiPost(path);
  } else {
    await apiDelete(path);
  }
  revalidatePath("/home");
  return { ok: true } as const;
}

export async function loadFollowingIds() {
  const user = await getSessionUser();
  if (!user?.id) return [];
  return getFollowingIds(user.id);
}

export async function toggleFollowUser(userId: string, nextFollowing: boolean) {
  const path = `social/${nextFollowing ? "follow" : "unfollow"}/${encodeURIComponent(userId)}`;
  try {
    const payload = await apiPost<unknown>(path);
    const failure = readApiFailure(payload);
    if (failure) throw new ApiError(400, failure, payload);
  } catch (error) {
    if (!isAlreadyInState(error, nextFollowing)) throw error;
  }
  return { ok: true } as const;
}

export async function sharePost(contentId: string, contentKind: HomeContentKind = "post") {
  await apiPost(`social/${engagementCollection(contentKind)}/${encodeURIComponent(contentId)}/share`, {
    Platform: "General",
  });
  revalidatePath("/home");
  return { ok: true } as const;
}

export async function recordStoryView(storyId: string) {
  try {
    await apiPost(`social/stories/${encodeURIComponent(storyId)}/view`, {});
  } catch {
    // Viewing is best effort; it must never block the story viewer.
  }
  return { ok: true } as const;
}

export async function loadPostComments(
  contentId: string,
  contentKind: HomeContentKind = "post",
  expectedCount = 0,
) {
  return getPostComments(contentId, contentKind, expectedCount);
}

export async function createPostCommentAction(
  contentId: string,
  text: string,
  contentKind: HomeContentKind = "post",
  parentCommentId: string | null = null,
) {
  const comment = await createPostComment(contentId, text, contentKind, parentCommentId);
  revalidatePath("/home");
  return comment;
}

export async function toggleCommentLike(
  commentId: string,
  nextLiked: boolean,
  contentKind: HomeContentKind = "post",
) {
  const collection = contentKind === "reel" ? "ReelComment" : "PostComment";
  const path = `social/${collection}/${encodeURIComponent(commentId)}/like`;
  if (nextLiked) {
    await apiPost(path);
  } else {
    await apiDelete(path);
  }
  return { ok: true } as const;
}
