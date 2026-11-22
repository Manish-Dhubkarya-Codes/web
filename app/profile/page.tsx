import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { Avatar } from "../home/avatar";
import { HomeHeader } from "../home/home-header";
import { HomeShell } from "../home/home-shell";
import { MobileTabBar } from "../home/mobile-tab-bar";
import { PlayIcon } from "../home/icons";
import { getSessionUser, hasRefreshToken } from "@/lib/server/auth";
import { getUserProfilePage } from "@/lib/server/home";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Your Profile - VuInn",
  description: "View your VuInn profile and uploaded reels.",
};

export default async function ProfilePage() {
  const user = await getSessionUser();
  if (!user) {
    if (await hasRefreshToken()) redirect("/api/auth/refresh?next=/profile");
    redirect("/login");
  }

  const { profile, reels } = await getUserProfilePage();
  const fallbackName = user.name?.trim() || "VuInn user";
  const name = profile?.name || fallbackName;
  const handle = profile?.handle ? `@${profile.handle}` : "";

  return (
    <main className="min-h-dvh bg-page text-ink">
      <HomeShell>
        <HomeHeader profile={profile} fallbackName={fallbackName} />

        <div className="mx-auto w-full max-w-[1060px] px-4 pb-[calc(env(safe-area-inset-bottom)+84px)] pt-6 sm:px-6 sm:pb-16 sm:pt-8">
          <section className="overflow-hidden rounded-[28px] border border-line bg-surface/75 shadow-[var(--shadow-card)]">
            <div className="theme-glow h-28 border-b border-line sm:h-36" />
            <div className="px-5 pb-6 sm:px-8 sm:pb-8">
              <div className="-mt-10 flex flex-col gap-5 sm:-mt-12 sm:flex-row sm:items-end sm:justify-between">
                <div className="flex items-end gap-4">
                  <span className="rounded-full bg-page p-1.5">
                    <Avatar name={name} src={profile?.avatarUrl} size="xl" />
                  </span>
                  <div className="pb-1">
                    <h1 className="font-display text-xl font-bold sm:text-2xl">{name}</h1>
                    {handle ? <p className="mt-0.5 text-sm text-muted">{handle}</p> : null}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 sm:min-w-[330px]">
                  <Stat label="Reels" value={profile?.reelCount ?? reels.length} />
                  <Stat label="Followers" value={profile?.followerCount ?? 0} />
                  <Stat label="Following" value={profile?.followingCount ?? 0} />
                </div>
              </div>

              {profile?.bio ? (
                <p className="mt-5 max-w-[680px] text-sm leading-6 text-body">{profile.bio}</p>
              ) : null}

              <div className="mt-5 flex flex-wrap gap-2 text-xs">
                {profile?.email ? <DetailChip label="Email" value={profile.email} /> : null}
                {profile?.phoneNumber || user.phoneNumber ? (
                  <DetailChip label="Contact" value={profile?.phoneNumber || user.phoneNumber} />
                ) : null}
                {profile?.location ? <DetailChip label="Location" value={profile.location} /> : null}
                {profile?.website ? <DetailChip label="Website" value={profile.website} /> : null}
              </div>
            </div>
          </section>

          <section className="mt-6">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-display text-base font-bold">Uploaded reels</h2>
              <span className="text-xs text-muted">{reels.length} total</span>
            </div>

            {reels.length > 0 ? (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                {reels.map((reel) => {
                  const media = reel.media.find((item) => item.kind === "video") ?? reel.media[0];
                  if (!media) return null;
                  return (
                    <Link
                      key={reel.id}
                      href="/reels"
                      className="group relative aspect-[9/14] overflow-hidden rounded-2xl border border-line bg-raised"
                    >
                      {media.posterUrl || media.kind === "photo" ? (
                        <img
                          src={media.posterUrl || media.url}
                          alt={reel.caption || "Uploaded reel"}
                          loading="lazy"
                          className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.02]"
                        />
                      ) : (
                        <video
                          src={media.url}
                          muted
                          preload="metadata"
                          className="h-full w-full object-cover"
                        />
                      )}
                      <span className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-transparent" />
                      <span className="absolute bottom-2 left-2 inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-black">
                        <PlayIcon className="h-4 w-4" />
                      </span>
                      {reel.caption ? (
                        <span className="absolute bottom-3 left-12 right-3 line-clamp-2 text-xs font-semibold text-white">
                          {reel.caption}
                        </span>
                      ) : null}
                    </Link>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-line px-6 py-12 text-center">
                <p className="text-sm font-semibold">No reels uploaded yet</p>
                <p className="mt-1 text-xs text-muted">Your uploaded reels will appear here.</p>
              </div>
            )}
          </section>
        </div>

        <MobileTabBar />
      </HomeShell>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-line bg-raised/70 px-3 py-3 text-center">
      <p className="font-display text-lg font-bold">{value.toLocaleString()}</p>
      <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted">
        {label}
      </p>
    </div>
  );
}

function DetailChip({ label, value }: { label: string; value: string }) {
  return (
    <span className="max-w-full rounded-full border border-line bg-raised/70 px-3 py-2">
      <span className="mr-1.5 text-muted">{label}:</span>
      <span className="break-all text-body">{value}</span>
    </span>
  );
}
