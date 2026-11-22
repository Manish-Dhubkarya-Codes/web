"use client";

export default function HomeError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-page px-5 text-ink">
      <div
        aria-hidden
        className="theme-glow pointer-events-none absolute inset-x-0 top-0 h-[520px]"
      />
      <div className="relative z-10 w-full max-w-md rounded-3xl border border-line bg-surface p-8 text-center shadow-xl">
        <p className="text-[9px] font-semibold uppercase tracking-[0.22em] text-faint">
          Home unavailable
        </p>
        <h1 className="mt-3 font-display text-2xl font-bold tracking-tight text-ink">
          Couldn&apos;t load your feed
        </h1>
        <p className="mt-2 text-sm leading-6 text-muted">
          VuInn couldn&apos;t reach the feed right now. Try again, or sign in again if this keeps
          happening.
        </p>
        <div className="mt-6 flex flex-col justify-center gap-2 sm:flex-row">
          <button
            type="button"
            onClick={reset}
            className="rounded-full bg-ink px-5 py-2.5 text-xs font-bold text-page transition hover:opacity-90"
          >
            Try again
          </button>
          <a
            href="/login"
            className="rounded-full border border-line px-5 py-2.5 text-xs font-bold text-ink transition hover:border-accent/40"
          >
            Sign in again
          </a>
        </div>
      </div>
    </main>
  );
}
