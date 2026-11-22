export interface HomeAuthor {
  id: string;
  name: string;
  handle?: string;
  avatarUrl?: string;
  isOnline?: boolean;
}

export interface HomeMedia {
  id: string;
  kind: "photo" | "video";
  url: string;
  posterUrl?: string;
  width?: number;
  height?: number;
  durationSeconds?: number;
}

export interface HomeComment {
  id: string;
  author: HomeAuthor;
  text: string;
  createdAtLabel: string;
  parentCommentId: string | null;
  isLiked: boolean;
  likeCount: number;
}

export type HomeContentKind = "post" | "reel";

export interface HomePost {
  id: string;
  contentId: string;
  contentKind: HomeContentKind;
  author: HomeAuthor;
  caption: string;
  location?: string;
  media: HomeMedia[];
  likeCount: number;
  commentCount: number;
  shareCount: number;
  isLiked: boolean;
  isSaved: boolean;
  isFollowingAuthor: boolean;
  createdAtLabel: string;
  commentsPreview: HomeComment[];
}

export interface HomeFeedPage {
  items: HomePost[];
  nextCursor: string | null;
  hasNextPage: boolean;
}

export interface HomeStory {
  id: string;
  mediaUrl: string;
  mediaKind: "photo" | "video";
  thumbnailUrl?: string;
  caption: string;
  createdAtLabel: string;
  isViewed: boolean;
  isOwn: boolean;
}

export interface HomeStoryGroup {
  userId: string;
  author: HomeAuthor;
  stories: HomeStory[];
  allViewed: boolean;
  isOwn: boolean;
  isFollowing: boolean;
}

export interface HomeProfile {
  id: string;
  name: string;
  handle?: string;
  avatarUrl?: string;
  email?: string;
  phoneNumber?: string;
  bio?: string;
  location?: string;
  website?: string;
  followerCount: number;
  followingCount: number;
  reelCount: number;
}
