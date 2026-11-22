import type {
  HomeAuthor,
  HomeComment,
  HomeContentKind,
  HomeFeedPage,
  HomePost,
  HomeProfile,
  HomeStoryGroup,
} from "@/lib/home/types";
import {
  mapHomeAuthor,
  mapHomeComment,
  mapHomePost,
  mapHomeProfile,
  mapHomeStoryGroup,
  mergeHomeStoryGroups,
} from "@/lib/home/map";
import { getSessionUser } from "@/lib/server/auth";
import { ApiError, apiGet, apiPost } from "@/lib/server/api";

const HOME_PAGE_SIZE = 12;
const COMMENT_PAGE_SIZE = 30;

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function isRedirectError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "digest" in error &&
    typeof (error as { digest?: unknown }).digest === "string" &&
    (error as { digest: string }).digest.startsWith("NEXT_REDIRECT")
  );
}

async function getOptional(path: string): Promise<unknown | null> {
  try {
    return await apiGet<unknown>(path);
  } catch (error) {
    if (isRedirectError(error)) throw error;
    return null;
  }
}

function unwrapEnvelope(payload: unknown): unknown {
  const body = asRecord(payload);
  if (body.success === false) {
    throw new Error(typeof body.message === "string" ? body.message : "VuInn request failed.");
  }
  return Object.prototype.hasOwnProperty.call(body, "data") ? body.data : body;
}

function listFrom(payload: unknown, keys: string[]): unknown[] {
  const body = asRecord(payload);
  const nested = Object.prototype.hasOwnProperty.call(body, "data") ? body.data : body;

  if (Array.isArray(nested)) return nested;

  const page = asRecord(nested);
  for (const key of ["items", "data", ...keys]) {
    const value = page[key];
    if (Array.isArray(value)) return value;
  }

  return [];
}

function normalizePage(payload: unknown, keys: string[]): {
  items: unknown[];
  nextCursor: string | null;
  hasNextPage: boolean;
} {
  const body = asRecord(payload);
  const nested = Object.prototype.hasOwnProperty.call(body, "data") ? body.data : body;
  const page = Array.isArray(nested) ? body : asRecord(nested);

  const nextCursor =
    (typeof page.nextCursor === "string" && page.nextCursor) ||
    (typeof body.nextCursor === "string" && body.nextCursor) ||
    (typeof page.next_cursor === "string" && page.next_cursor) ||
    (typeof page.continuationToken === "string" && page.continuationToken) ||
    (typeof page.nextPageToken === "string" && page.nextPageToken) ||
    null;
  const statedHasNext = page.hasNextPage;
  const hasNextPage =
    typeof statedHasNext === "boolean" ? statedHasNext && nextCursor !== null : nextCursor !== null;

  return {
    items: listFrom(payload, keys),
    nextCursor,
    hasNextPage,
  };
}

function uniqueAuthorCount(posts: HomeFeedPage["items"]): number {
  return new Set(posts.map((post) => post.author.id || post.author.name)).size;
}

function mergeUniquePosts(primary: HomeFeedPage["items"], extra: HomeFeedPage["items"]) {
  const seen = new Set(primary.map((post) => post.id));
  const additions = extra.filter((post) => !seen.has(post.id));
  if (additions.length === 0) return primary;

  const merged: HomeFeedPage["items"] = [];
  let nextAddition = 0;
  for (let index = 0; index < primary.length; index += 1) {
    merged.push(primary[index]);
    if ((index + 1) % 2 === 0 && nextAddition < additions.length) {
      merged.push(additions[nextAddition]);
      nextAddition += 1;
    }
  }
  merged.push(...additions.slice(nextAddition));
  return merged;
}

export async function getHomeFeed(cursor?: string | null): Promise<HomeFeedPage> {
  const params = new URLSearchParams({ limit: String(HOME_PAGE_SIZE) });
  if (cursor) params.set("cursor", cursor);

  const payload = await apiGet<unknown>(`social/feed?${params.toString()}`);
  const page = normalizePage(payload, ["posts"]);
  const items = page.items
    .map(mapHomePost)
    .filter((post): post is NonNullable<typeof post> => post !== null);

  // The following feed can contain a single creator for a long stretch. Fill
  // it with explore posts so the home page still feels like a social feed.
  if (!cursor && uniqueAuthorCount(items) < 4) {
    const explorePayload = await getOptional(
      `social/explore?limit=${HOME_PAGE_SIZE}`,
    );
    if (explorePayload) {
      const explorePage = normalizePage(explorePayload, ["posts"]);
      const exploreItems = explorePage.items
        .map(mapHomePost)
        .filter((post): post is NonNullable<typeof post> => post !== null);
      return {
        items: mergeUniquePosts(items, exploreItems),
        nextCursor: page.nextCursor,
        hasNextPage: page.hasNextPage,
      };
    }
  }

  return {
    items,
    nextCursor: page.nextCursor,
    hasNextPage: page.hasNextPage,
  };
}

function reelMediaUrl(reel: Record<string, unknown>): string | undefined {
  const value =
    reel.videoUrl ??
    reel.mediaUrl ??
    reel.url ??
    (Array.isArray(reel.media) ? asRecord(reel.media[0]).url : undefined) ??
    (Array.isArray(reel.media) ? asRecord(reel.media[0]).mediaUrl : undefined) ??
    (Array.isArray(reel.media) ? asRecord(reel.media[0]).videoUrl : undefined);
  if (typeof value !== "string" || !value.trim()) return undefined;
  return value;
}

export async function getHomeReels(
  cursor?: string | null,
  searchQuery?: string | null,
): Promise<HomeFeedPage> {
  const params = new URLSearchParams({ limit: String(HOME_PAGE_SIZE) });
  if (cursor) params.set("cursor", cursor);
  if (searchQuery?.trim()) {
    const query = searchQuery.trim();
    params.set("search", query);
    params.set("query", query);
  }

  const payload = await apiGet<unknown>(`social/reelfeed?${params.toString()}`);
  const page = normalizePage(payload, ["reels"]);
  const items = page.items
    .map((item) => {
      const reel = asRecord(item);
      const id =
        typeof reel.id === "string"
          ? reel.id
          : typeof reel.reelId === "string"
            ? reel.reelId
            : "";
      const mediaUrl = reelMediaUrl(reel);
      if (!id || !mediaUrl) return null;

      return mapHomePost({ ...reel, id, mediaUrl, mediaKind: "reel", reelId: id });
    })
    .filter((post): post is HomePost => post !== null);

  const user = await getSessionUser();
  if (user?.id && items.length > 0) {
    const following = new Set(await getFollowingIds(user.id).catch(() => []));
    for (const post of items) {
      post.isFollowingAuthor = following.has(post.author.id);
    }
  }

  return {
    items,
    nextCursor: page.nextCursor,
    hasNextPage: page.hasNextPage,
  };
}

function followingIdsFrom(payload: unknown): Set<string> {
  const ids = listFrom(payload, ["users", "items"]).map((item) => {
    const user = asRecord(item);
    return typeof user.id === "string"
      ? user.id
      : typeof user.userId === "string"
        ? user.userId
        : null;
  });

  return new Set(ids.filter((id): id is string => Boolean(id)));
}

export async function getFollowingIds(userId: string): Promise<string[]> {
  const payload = await apiGet<unknown>(`social/${encodeURIComponent(userId)}/following`);
  return [...followingIdsFrom(payload)];
}

export async function getHomeSuggestions(limit = 10): Promise<HomeAuthor[]> {
  const user = await getSessionUser();
  const payload = await apiGet<unknown>("social/suggestions").catch(() => null);
  if (!payload) return [];

  const seen = new Set<string>();
  const suggestions = listFrom(payload, ["users", "items", "suggestions"])
    .map(mapHomeAuthor)
    .filter((author) => {
      if (!author.id || author.id === user?.id || seen.has(author.id)) return false;
      seen.add(author.id);
      return true;
    });

  return suggestions.slice(0, limit);
}

export async function getHomeStories(): Promise<HomeStoryGroup[]> {
  const user = await getSessionUser();
  const [feedPayload, minePayload, followingPayload] = await Promise.all([
    getOptional("social/stories?limit=30"),
    getOptional("social/stories/me?limit=30"),
    user?.id ? getOptional(`social/${encodeURIComponent(user.id)}/following`) : Promise.resolve(null),
  ]);

  const feedGroups = mergeHomeStoryGroups(
    listFrom(feedPayload, ["items", "stories"])
      .map((item) => mapHomeStoryGroup(item, user?.id))
      .filter((group): group is HomeStoryGroup => group !== null),
  );

  const ownGroups = mergeHomeStoryGroups(
    listFrom(minePayload, ["items", "stories"])
      .map((item) => mapHomeStoryGroup(item, user?.id))
      .filter((group): group is HomeStoryGroup => group !== null),
  );
  const own = ownGroups.find((group) => group.isOwn) ?? ownGroups[0] ?? null;
  const followingIds = followingIdsFrom(followingPayload);

  const groups = !own
    ? feedGroups
    : [own, ...feedGroups.filter((group) => group.userId !== own.userId)];

  return groups.map((group) => ({
    ...group,
    isFollowing: group.isOwn || followingIds.has(group.userId),
  }));
}

export async function getHomeProfile(): Promise<HomeProfile | null> {
  const payload = await apiGet<unknown>("platform/profile");
  const data = asRecord(unwrapEnvelope(payload));
  return mapHomeProfile(data.profile ?? data);
}

function countFrom(payload: unknown): number {
  if (typeof payload === "number") return payload;
  const body = asRecord(payload);
  const data = asRecord(body.data);
  for (const key of ["count", "total", "totalCount", "followersCount", "followingCount"]) {
    const value = body[key] ?? data[key];
    if (typeof value === "number") return value;
  }

  const items = listFrom(payload, ["users", "items"]);
  return items.length;
}

export async function getUserProfilePage(): Promise<{
  profile: HomeProfile | null;
  reels: HomePost[];
}> {
  const [profilePayload, reelsPayload] = await Promise.all([
    apiGet<unknown>("platform/profile").catch(() => null),
    apiGet<unknown>("social/reelfeed?limit=100").catch(() => null),
  ]);

  let profile: HomeProfile | null = null;
  if (profilePayload) {
    const data = asRecord(unwrapEnvelope(profilePayload));
    profile = mapHomeProfile(data.profile ?? data);
  }

  const user = await getSessionUser();
  const userId = profile?.id || user?.id || "";

  const [followersPayload, followingPayload] = await Promise.all([
    userId
      ? getOptional(`social/${encodeURIComponent(userId)}/followers`).catch(() => null)
      : Promise.resolve(null),
    userId
      ? getOptional(`social/${encodeURIComponent(userId)}/following`).catch(() => null)
      : Promise.resolve(null),
  ]);

  const reelPage = normalizePage(reelsPayload, ["reels"]);
  const reels = reelPage.items
    .map((item) => {
      const reel = asRecord(item);
      const id =
        typeof reel.id === "string"
          ? reel.id
          : typeof reel.reelId === "string"
            ? reel.reelId
            : "";
      const mediaUrl = reelMediaUrl(reel);
      if (!id || !mediaUrl) return null;
      return mapHomePost({ ...reel, id, mediaUrl, mediaKind: "reel", reelId: id });
    })
    .filter((post): post is HomePost => post !== null)
    .filter((post) => !userId || post.author.id === userId);

  if (profile) {
    profile = {
      ...profile,
      followerCount: followersPayload ? countFrom(followersPayload) : profile.followerCount,
      followingCount: followingPayload ? countFrom(followingPayload) : profile.followingCount,
      reelCount: reels.length || profile.reelCount,
    };
  }

  return { profile, reels };
}

function commentPath(contentId: string, contentKind: HomeContentKind): string {
  const collection = contentKind === "reel" ? "ReelComment" : "PostComment";
  return `social/${collection}/${encodeURIComponent(contentId)}`;
}

async function fetchPostComments(
  contentId: string,
  contentKind: HomeContentKind,
): Promise<HomeComment[]> {
  const payload = await apiGet<unknown>(
    `${commentPath(contentId, contentKind)}?limit=${COMMENT_PAGE_SIZE}`,
  );
  return listFrom(payload, ["comments"])
    .map(mapHomeComment)
    .filter((comment): comment is HomeComment => comment !== null);
}

export async function getPostComments(
  contentId: string,
  contentKind: HomeContentKind = "post",
  expectedCount = 0,
): Promise<HomeComment[]> {
  let primary: HomeComment[] | null = null;
  try {
    primary = await fetchPostComments(contentId, contentKind);
  } catch (error) {
    if (!(error instanceof ApiError) || error.status !== 404) throw error;
  }

  if (primary && (primary.length > 0 || expectedCount === 0)) return primary;

  // Older feed rows can omit reel metadata, and some deployments answer the
  // wrong collection with an empty page. If the feed says there are comments,
  // check the other collection before deciding the conversation is empty.
  try {
    return await fetchPostComments(contentId, contentKind === "reel" ? "post" : "reel");
  } catch (fallbackError) {
    if (fallbackError instanceof ApiError && fallbackError.status === 404) return primary ?? [];
    throw fallbackError;
  }
}

export async function createPostComment(
  contentId: string,
  text: string,
  contentKind: HomeContentKind = "post",
  parentCommentId: string | null = null,
): Promise<HomeComment> {
  const trimmed = text.trim();
  if (!trimmed) throw new Error("Comment cannot be empty.");

  const body = { Content: trimmed, ParentCommentId: parentCommentId };
  let payload: unknown;
  try {
    payload = await apiPost<unknown>(commentPath(contentId, contentKind), body);
  } catch (error) {
    if (!(error instanceof ApiError) || error.status !== 404) throw error;
    payload = await apiPost<unknown>(
      commentPath(contentId, contentKind === "reel" ? "post" : "reel"),
      body,
    );
  }

  const data = unwrapEnvelope(payload);
  const record = asRecord(data);
  const comment = mapHomeComment(record.comment ?? data);

  if (!comment) throw new Error("Comment could not be created.");

  // Some API responses omit the parent on the newly created comment; keep the
  // reply attached to the thread even before the sheet is reloaded.
  return parentCommentId ? { ...comment, parentCommentId } : comment;
}
