import { timeAgo } from "@/lib/format";
import type {
  HomeAuthor,
  HomeComment,
  HomeContentKind,
  HomeMedia,
  HomePost,
  HomeProfile,
  HomeStory,
  HomeStoryGroup,
} from "@/lib/home/types";
import { apiBaseUrl } from "@/lib/server/auth";

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function pickString(record: Record<string, unknown>, keys: string[]): string | undefined {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return undefined;
}

function pickNumber(record: Record<string, unknown>, keys: string[]): number | undefined {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && value.trim()) {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) return parsed;
    }
  }
  return undefined;
}

function pickBoolean(record: Record<string, unknown>, keys: string[]): boolean | undefined {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "boolean") return value;
  }
  return undefined;
}

function resolveMediaUrl(value: unknown): string | undefined {
  const raw = typeof value === "string" ? value.trim() : "";
  if (!raw) return undefined;
  if (/^(https?|blob|data):/i.test(raw)) return raw;
  if (raw.startsWith("//")) return `https:${raw}`;

  try {
    return new URL(raw.replace(/^\/+/, ""), new URL(apiBaseUrl()).origin).toString();
  } catch {
    return undefined;
  }
}

function mapAuthor(raw: unknown): HomeAuthor {
  const record = asRecord(raw);
  const source = asRecord(record.author);
  const author = Object.keys(source).length > 0 ? source : record;

  const id =
    pickString(author, ["userId"]) ??
    pickString(record, ["creatorUserId", "userId"]) ??
    pickString(author, ["id"]) ??
    "";
  const name =
    pickString(author, ["nickName", "userName", "displayName"]) ??
    pickString(record, [
      "creatorName",
      "creatorNickName",
      "creatorUserName",
      "nickName",
      "userName",
      "displayName",
      "title",
    ]) ??
    "VuInn creator";
  const handle =
    pickString(author, ["userName", "handle"]) ??
    pickString(record, ["creatorUserName", "creatorHandle", "userName", "handle"]);
  const avatarUrl = resolveMediaUrl(
    pickString(author, ["profilePicUrl", "avatarUrl", "userAvatarUrl", "userProfilePic"]) ??
      pickString(record, [
        "creatorAvatarUrl",
        "userAvatarUrl",
        "userProfilePic",
        "avatarUrl",
        "profilePicUrl",
      ]),
  );

  return {
    id,
    name,
    handle: handle?.replace(/^@/, ""),
    avatarUrl,
    isOnline: pickBoolean(author, ["isOnline", "online"]) ?? false,
  };
}

function mediaKind(raw: Record<string, unknown>, post: Record<string, unknown>): "photo" | "video" {
  const mimeType = pickString(raw, ["mimeType"]);
  if (mimeType?.toLowerCase().startsWith("video/")) return "video";

  const mediaType = pickString(raw, ["mediaType"]);
  if (mediaType?.toLowerCase() === "video") return "video";

  if (pickNumber(raw, ["type"]) === 1) return "video";

  const postKind = pickString(post, ["mediaKind"]);
  if (postKind === "video" || postKind === "reel") return "video";

  return "photo";
}

function mapMedia(raw: unknown, post: Record<string, unknown>, postId: string, index: number): HomeMedia | null {
  const media = asRecord(raw);
  const url = resolveMediaUrl(
    pickString(media, ["url", "mediaUrl", "videoUrl"]) ?? pickString(post, ["mediaUrl"]),
  );
  if (!url) return null;

  return {
    id: pickString(media, ["id", "mediaId"]) ?? `${postId}-media-${index}`,
    kind: mediaKind(media, post),
    url,
    posterUrl: resolveMediaUrl(
      pickString(media, ["thumbnailUrl", "posterUrl"]) ?? pickString(post, ["thumbnailUrl"]),
    ),
    width: pickNumber(media, ["width"]),
    height: pickNumber(media, ["height"]),
    durationSeconds: pickNumber(media, ["durationSeconds", "duration"]),
  };
}

export function mapHomeAuthor(raw: unknown): HomeAuthor {
  return mapAuthor(raw);
}

export function mapHomeComment(raw: unknown): HomeComment | null {
  const comment = asRecord(raw);
  const id = pickString(comment, ["id", "commentId"]);
  if (!id) return null;

  return {
    id,
    author: mapAuthor(comment.author ?? comment),
    text: pickString(comment, ["text", "content", "commentText"]) ?? "",
    createdAtLabel: timeAgo(
      pickString(comment, ["createdAt"]) ?? pickNumber(comment, ["createdAt"]) ?? undefined,
    ),
    parentCommentId: pickString(comment, ["parentCommentId"]) ?? null,
    isLiked: pickBoolean(comment, ["hasLiked", "isLiked"]) ?? false,
    likeCount: pickNumber(comment, ["likesCount", "likeCount"]) ?? 0,
  };
}

export function mapHomePost(raw: unknown): HomePost | null {
  const post = asRecord(raw);
  const id = pickString(post, ["id", "postId"]);
  if (!id) return null;

  const reelId = pickString(post, ["reelId"]);
  const contentType = pickString(post, ["contentType"])?.toLowerCase();
  const mediaKind = pickString(post, ["mediaKind"])?.toLowerCase();
  const contentKind: HomeContentKind =
    pickBoolean(post, ["isReel"]) === true ||
    contentType === "reel" ||
    Boolean(reelId) ||
    mediaKind === "reel"
      ? "reel"
      : "post";
  const contentId = contentKind === "reel" ? (reelId ?? id) : id;

  const mediaRaw = Array.isArray(post.media) ? post.media : [];
  const media = mediaRaw
    .map((item, index) => mapMedia(item, post, id, index))
    .filter((item): item is HomeMedia => item !== null);

  if (media.length === 0) {
    const fallbackUrl = resolveMediaUrl(pickString(post, ["mediaUrl"]));
    if (fallbackUrl) {
      const postKind = pickString(post, ["mediaKind"]);
      media.push({
        id: `${id}-media`,
        kind: postKind === "video" || postKind === "reel" ? "video" : "photo",
        url: fallbackUrl,
        posterUrl: resolveMediaUrl(pickString(post, ["thumbnailUrl"])),
      });
    }
  }

  const commentsRaw = Array.isArray(post.comments) ? post.comments : [];
  const commentsPreview = commentsRaw
    .map(mapHomeComment)
    .filter((comment): comment is HomeComment => comment !== null)
    .slice(0, 1);

  return {
    id,
    contentId,
    contentKind,
    author: mapAuthor(post.author ?? post),
    caption:
      pickString(post, ["caption", "title", "description", "text", "reelCaption"]) ??
      "",
    location: pickString(post, ["location"]),
    media,
    likeCount: pickNumber(post, ["likesCount", "likeCount"]) ?? 0,
    commentCount: pickNumber(post, ["commentsCount", "commentCount"]) ?? 0,
    shareCount: pickNumber(post, ["sharesCount", "shareCount"]) ?? 0,
    isLiked: pickBoolean(post, ["hasLiked", "isLiked"]) ?? false,
    isSaved: pickBoolean(post, ["hasSaved", "isSaved"]) ?? false,
    isFollowingAuthor:
      pickBoolean(post, ["isFollowingAuthor", "isFollowingUploader", "isFollowing"]) ?? false,
    createdAtLabel: timeAgo(
      pickString(post, ["createdAt"]) ?? pickNumber(post, ["createdAt"]) ?? undefined,
    ),
    commentsPreview,
  };
}

function storyMediaKind(story: Record<string, unknown>, group: Record<string, unknown>): "photo" | "video" {
  const kind = pickString(story, ["mediaKind"]) ?? pickString(group, ["mediaKind"]);
  if (kind === "video") return "video";
  if (kind === "photo" || kind === "image") return "photo";

  const mediaType = pickString(story, ["mediaType"])?.toLowerCase();
  if (mediaType === "video") return "video";
  if (mediaType === "image" || mediaType === "photo") return "photo";

  const mimeType = pickString(story, ["mimeType"]);
  return mimeType?.toLowerCase().startsWith("video/") ? "video" : "photo";
}

function storyThumbnailUrl(
  story: Record<string, unknown>,
  mediaKind: "photo" | "video",
  mediaUrl: string,
): string | undefined {
  const explicit = resolveMediaUrl(pickString(story, ["thumbnailUrl"]));
  if (explicit) return explicit;
  if (mediaKind !== "video") return undefined;

  const mediaId = pickString(story, ["mediaId"]);
  if (!mediaId) return undefined;

  try {
    return `${new URL(mediaUrl).origin}/thumbnails/${mediaId}/thumbnail.webp`;
  } catch {
    return undefined;
  }
}

export function mapHomeStory(
  raw: unknown,
  group: Record<string, unknown> = {},
  isOwn = false,
): HomeStory | null {
  const story = asRecord(raw);
  const id = pickString(story, ["id", "storyId"]);
  const mediaUrlRaw = pickString(story, ["mediaUrl", "url"]) ?? pickString(group, ["mediaUrl"]);
  const mediaUrl = resolveMediaUrl(mediaUrlRaw);
  if (!id || !mediaUrl) return null;

  const status = pickNumber(story, ["status"]);
  const isProcessing =
    status === 1 || (/\/original(?:[?#]|$)/.test(mediaUrlRaw ?? "") && status !== 2);
  if (isProcessing) return null;

  const mediaKind = storyMediaKind(story, group);
  const createdAt =
    pickString(story, ["createdAt"]) ?? pickNumber(story, ["createdAt"]) ?? undefined;

  return {
    id,
    mediaUrl,
    mediaKind,
    thumbnailUrl:
      storyThumbnailUrl(story, mediaKind, mediaUrl) ??
      (mediaKind === "photo" ? mediaUrl : undefined),
    caption: pickString(story, ["caption"]) ?? "",
    createdAtLabel: timeAgo(createdAt),
    isViewed:
      pickBoolean(story, ["isViewed"]) ??
      pickBoolean(group, ["allStoriesViewed"]) ??
      false,
    isOwn: pickBoolean(story, ["isOwn"]) ?? pickBoolean(group, ["isOwn"]) ?? isOwn,
  };
}

export function mapHomeStoryGroup(raw: unknown, selfId?: string): HomeStoryGroup | null {
  const group = asRecord(raw);
  const groupedStories = Array.isArray(group.stories) ? group.stories : null;
  const grouped = groupedStories !== null;
  const firstStory = groupedStories ? asRecord(groupedStories[0]) : group;
  const storiesRaw: unknown[] = groupedStories ?? (group.mediaUrl ? [group] : []);
  const author = mapAuthor(group.author ?? firstStory.author ?? group);
  const userId =
    pickString(group, ["userId"]) ??
    author.id ??
    (grouped ? pickString(group, ["id"]) : undefined) ??
    pickString(firstStory, ["userId"]) ??
    "";
  const isOwn =
    pickBoolean(group, ["isOwn"]) ??
    (Boolean(selfId) && (userId === selfId || author.id === selfId));

  const stories = storiesRaw
    .map((item) => mapHomeStory(item, group, isOwn))
    .filter((story): story is HomeStory => story !== null);
  if (stories.length === 0) return null;

  const allViewed = pickBoolean(group, ["allStoriesViewed"]) ?? stories.every((story) => story.isViewed);

  return {
    userId: userId || author.id || stories[0].id,
    author: { ...author, id: userId || author.id },
    stories: stories.map((story) => ({ ...story, isOwn })),
    allViewed,
    isOwn,
    isFollowing: false,
  };
}

export function mergeHomeStoryGroups(groups: HomeStoryGroup[]): HomeStoryGroup[] {
  const merged = new Map<string, HomeStoryGroup>();

  for (const group of groups) {
    const key = group.userId || group.author.id || group.stories[0]?.id || group.author.name;
    const existing = merged.get(key);
    if (!existing) {
      merged.set(key, { ...group, stories: [...group.stories], author: { ...group.author } });
      continue;
    }

    const seen = new Set(existing.stories.map((story) => story.id));
    existing.stories.push(...group.stories.filter((story) => !seen.has(story.id)));
    existing.allViewed = existing.allViewed && group.allViewed;
    existing.isOwn = existing.isOwn || group.isOwn;
    existing.isFollowing = existing.isFollowing || group.isFollowing;
  }

  return [...merged.values()];
}

export function mapHomeProfile(raw: unknown): HomeProfile | null {
  const profile = asRecord(raw);
  const id = pickString(profile, ["userId", "id"]) ?? "";
  const name =
    pickString(profile, ["nickName", "displayName", "userName"]) ?? "";
  if (!id && !name) return null;

  return {
    id,
    name: name || "VuInn user",
    handle: pickString(profile, ["userName", "handle"])?.replace(/^@/, ""),
    avatarUrl: resolveMediaUrl(pickString(profile, ["profilePicUrl", "avatarUrl"])),
    email: pickString(profile, ["email", "emailAddress"]),
    phoneNumber: pickString(profile, ["phoneNumber", "phone", "mobileNumber"]),
    bio: pickString(profile, ["bio", "about", "description"]),
    location: pickString(profile, ["location", "city", "country"]),
    website: pickString(profile, ["website", "webUrl", "websiteUrl"]),
    followerCount:
      pickNumber(profile, ["followersCount", "followerCount", "followers"]) ?? 0,
    followingCount:
      pickNumber(profile, ["followingCount", "followingsCount", "following"]) ?? 0,
    reelCount:
      pickNumber(profile, ["reelsCount", "reelCount", "contentCount"]) ?? 0,
  };
}
