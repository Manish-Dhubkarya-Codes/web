import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";

import { ApiError } from "@/lib/server/api";
import { getSessionUser } from "@/lib/server/auth";
import {
  getHomeFeed,
  getHomeProfile,
  getHomeStories,
  getHomeSuggestions,
} from "@/lib/server/home";

import { HomeFeed } from "./home-feed";
import { HomeHeader } from "./home-header";
import { HomeShell } from "./home-shell";
import { MobileTabBar } from "./mobile-tab-bar";
import { StoryRail } from "./story-rail";
import { SuggestedFriends } from "./suggested-friends";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Home - VuInn",
  description: "Your VuInn home feed.",
};

function isNextRedirect(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "digest" in error &&
    typeof (error as { digest?: unknown }).digest === "string" &&
    (error as { digest: string }).digest.startsWith("NEXT_REDIRECT")
  );
}

async function ProfileHeader({ fallbackName }: { fallbackName: string }) {
  const profile = await getHomeProfile().catch((error: unknown) => {
    if (isNextRedirect(error)) throw error;
    return null;
  });

  return <HomeHeader profile={profile} fallbackName={fallbackName} />;
}

async function HomeStories() {
  const groups = await getHomeStories().catch((error: unknown) => {
    if (isNextRedirect(error)) throw error;
    return [];
  });

  return <StoryRail groups={groups} />;
}

function StoryRailSkeleton() {
  return (
    <div aria-hidden className="mb-4 flex gap-2.5 overflow-hidden px-1 sm:mb-5 sm:gap-3">
      {[0, 1, 2, 3, 4].map((item) => (
        <div
          key={item}
          className="aspect-[10/17] w-[84px] shrink-0 animate-pulse rounded-2xl bg-line/60 sm:w-[108px] md:w-[122px] lg:w-[138px]"
        />
      ))}
    </div>
  );
}

export default async function HomePage() {
  const user = await getSessionUser();
  const fallbackName = user?.name?.trim() || "VuInn user";
  const suggestionsRequest = getHomeSuggestions().catch((error: unknown) => {
    if (isNextRedirect(error)) throw error;
    return [];
  });

  let feed;
  try {
    feed = await getHomeFeed();
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      redirect("/api/auth/refresh?next=/home");
    }
    throw error;
  }

  const suggestions = await suggestionsRequest;

  return (
    <main className="relative min-h-dvh overflow-x-clip bg-page text-ink">
      <div
        aria-hidden
        className="theme-glow pointer-events-none absolute inset-x-0 top-0 h-[520px]"
      />

      <HomeShell>
        <Suspense fallback={<HomeHeader profile={null} fallbackName={fallbackName} />}>
          <ProfileHeader fallbackName={fallbackName} />
        </Suspense>

        <div className="relative z-10 mx-auto flex w-full max-w-[1060px] items-start justify-center gap-8 px-3 pb-[calc(env(safe-area-inset-bottom)+84px)] pt-5 sm:px-5 sm:pb-16 sm:pt-7">
          <section className="w-full min-w-0 max-w-[680px] flex-1">
            <Suspense fallback={<StoryRailSkeleton />}>
              <HomeStories />
            </Suspense>

            <HomeFeed initialPage={feed} />
          </section>

          {suggestions.length > 0 ? (
            <aside className="sticky top-[73px] hidden w-[280px] shrink-0 lg:block xl:w-[300px]">
              <SuggestedFriends users={suggestions} />
            </aside>
          ) : null}
        </div>

        <MobileTabBar />
      </HomeShell>
    </main>
  );
}
