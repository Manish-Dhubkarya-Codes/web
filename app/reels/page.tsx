import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { ApiError } from "@/lib/server/api";
import { getSessionUser, hasRefreshToken } from "@/lib/server/auth";
import { getHomeProfile, getHomeReels } from "@/lib/server/home";

import { MobileTabBar } from "../home/mobile-tab-bar";
import { HomeShell } from "../home/home-shell";
import { ReelFeed } from "./reel-feed";
import { HomeHeader } from "../home/home-header";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Inn - VuInn",
  description: "Short videos from the VuInn community.",
};

export default async function ReelsPage() {
  let page;
  try {
    page = await getHomeReels();
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      redirect("/api/auth/refresh?next=/reels");
    }
    throw error;
  }

  const user = await getSessionUser();
    if (!user) {
      if (await hasRefreshToken()) redirect("/api/auth/refresh?next=/reels");
      redirect("/login");
    }
  const profile = await getHomeProfile().catch(() => null);

  return (
    <main className="min-h-dvh bg-black text-white">
      <HomeShell>
        <HomeHeader profile={profile} fallbackName={user.name?.trim() || "VuInn user"} />
        <ReelFeed initialPage={page} selfId={user.id} />
        <MobileTabBar />
      </HomeShell>
    </main>
  );
}
