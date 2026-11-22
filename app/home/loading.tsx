export default function HomeLoading() {
  return (
    <main className="relative min-h-dvh overflow-x-clip bg-page text-ink">
      <div
        aria-hidden
        className="theme-glow pointer-events-none absolute inset-x-0 top-0 h-[520px]"
      />
      <header className="sticky top-0 z-30 border-b border-line bg-page/85 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-[760px] items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="h-8 w-28 animate-pulse rounded-full bg-line/70" />
          <div className="h-9 w-9 animate-pulse rounded-full bg-line/70" />
        </div>
      </header>

      <section className="relative z-10 mx-auto w-full max-w-[680px] px-3 pb-16 pt-5 sm:px-5 sm:pt-7">
        <div className="mb-4 px-2 sm:mb-5">
          <div className="h-2.5 w-20 animate-pulse rounded-full bg-line/70" />
          <div className="mt-2 h-7 w-28 animate-pulse rounded-full bg-line/70" />
        </div>

        <div className="space-y-4 sm:space-y-5">
          {[0, 1].map((item) => (
            <div key={item} className="overflow-hidden rounded-3xl border border-line bg-surface">
              <div className="flex items-center gap-3 px-4 py-4 sm:px-5">
                <div className="h-10 w-10 animate-pulse rounded-full bg-line/70" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-32 animate-pulse rounded-full bg-line/70" />
                  <div className="h-2.5 w-24 animate-pulse rounded-full bg-line/60" />
                </div>
              </div>
              <div className="h-[280px] w-full animate-pulse bg-line/50" />
              <div className="flex gap-3 px-4 py-4 sm:px-5">
                <div className="h-5 w-12 animate-pulse rounded-full bg-line/60" />
                <div className="h-5 w-12 animate-pulse rounded-full bg-line/60" />
                <div className="h-5 w-12 animate-pulse rounded-full bg-line/60" />
              </div>
            </div>
          ))}
        </div>
        <span className="sr-only">Loading your home feed…</span>
      </section>
    </main>
  );
}
