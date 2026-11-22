import Image from "next/image";
import Link from "next/link";

import { ThemeToggle } from "./theme-toggle";

export default function Home() {
  return (
    <main className="relative flex min-h-dvh flex-col overflow-hidden bg-page text-ink">
      <div
        aria-hidden
        className="theme-glow pointer-events-none absolute inset-x-0 top-0 h-[540px]"
      />

      <header className="relative z-10 mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-6">
        <Link href="/" className="flex items-center gap-3">
          <Image
            src="/brand/LogoMark.png"
            alt=""
            width={80}
            height={59}
            priority
            className="h-9 w-auto"
          />
          <span className="font-display text-xl font-bold tracking-tight">VuInn</span>
        </Link>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <span className="hidden rounded-full border border-line px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted sm:inline">
            Web
          </span>
          <Link
            href="/login"
            className="inline-flex min-h-10 items-center rounded-full bg-ink px-4 text-xs font-semibold text-page transition hover:opacity-85"
          >
            Log in
          </Link>
        </div>
      </header>

      <section className="relative z-10 mx-auto flex w-full max-w-6xl flex-1 flex-col justify-center px-6 pb-24 pt-12">
        <h1 className="max-w-3xl font-display text-5xl font-bold leading-[0.95] tracking-[-0.04em] sm:text-7xl">
          Your feed.
          <br />
          Your people.
          <br />
          <span className="bg-[linear-gradient(90deg,#8B5CF6,#C05BFF,#F9A11B)] bg-clip-text text-transparent">
            On the big screen.
          </span>
        </h1>

        <p className="mt-8 max-w-xl text-base leading-7 text-body">
          The VuInn web experience is being built on the same backend and the same features as the
          app - with a layout made for desktop.
        </p>

        <div className="mt-10 flex flex-wrap items-center gap-3">
          <span className="rounded-full border border-accent-line bg-accent-soft px-4 py-2 text-xs font-semibold text-accent-ink">
            Next.js scaffold ready
          </span>
          <span className="text-xs text-faint">Mobile app untouched</span>
        </div>
      </section>

      <footer className="relative z-10 border-t border-line px-6 py-5 text-xs text-faint">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between">
          <span>VuInn</span>
          <span>Web foundation · 0.1.0</span>
        </div>
      </footer>
    </main>
  );
}
