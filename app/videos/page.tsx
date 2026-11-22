import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { ApiError } from "@/lib/server/api";
import { getSessionUser, hasRefreshToken } from "@/lib/server/auth";
import { getHomeProfile, getHomeReels } from "@/lib/server/home";

import { HomeHeader } from "../home/home-header";
import { HomeShell } from "../home/home-shell";
import { MobileTabBar } from "../home/mobile-tab-bar";
import { VideoLibrary } from "./video-library";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Videos - VuInn",
  description: "Long-form videos from the VuInn community.",
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

export default async function VideosPage() {
  const user = await getSessionUser();
  if (!user) {
    if (await hasRefreshToken()) redirect("/api/auth/refresh?next=/videos");
    redirect("/login");
  }

  let feed;
  try {
    feed = await getHomeReels();
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      redirect("/api/auth/refresh?next=/videos");
    }
    throw error;
  }

  const profile = await getHomeProfile().catch((error: unknown) => {
    if (isNextRedirect(error)) throw error;
    return null;
  });

  return (
    <main className="min-h-dvh bg-page text-ink">
      <HomeShell>
        <HomeHeader profile={profile} fallbackName={user.name?.trim() || "VuInn user"} />
        <VideoLibrary
          initialPage={feed}
        />
        <MobileTabBar />
      </HomeShell>
    </main>
  );
}
