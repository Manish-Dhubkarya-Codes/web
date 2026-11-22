import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";

import { getSessionUser } from "@/lib/server/auth";

import { ThemeToggle } from "../theme-toggle";
import { AuthPanel } from "./auth-panel";
import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Log in - VuInn",
  description: "Log in to VuInn with your mobile number.",
};

export default async function LoginPage() {
  const user = await getSessionUser();
  if (user) redirect("/home");

  return (
    <main className="min-h-dvh overflow-x-clip bg-page text-ink lg:grid lg:grid-cols-[1.05fr_0.95fr]">
      <AuthPanel />

      <section className="relative flex min-h-dvh items-start justify-center bg-page px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[max(1.25rem,env(safe-area-inset-top))] sm:px-6 sm:pt-8 lg:items-center lg:px-8 lg:py-8">
        <div aria-hidden className="theme-glow pointer-events-none absolute inset-0 lg:hidden" />

        <div className="relative z-10 w-full max-w-[430px]">
          <div className="mb-6 flex min-h-11 items-center justify-between gap-2 sm:mb-8 lg:hidden">
            <Link href="/" className="flex min-h-11 items-center gap-2.5">
              <Image
                src="/brand/LogoMark.png"
                alt=""
                width={80}
                height={59}
                priority
                className="h-9 w-auto sm:h-10"
              />
              <span className="font-display text-lg font-bold tracking-tight sm:text-xl">VuInn</span>
            </Link>
            <div className="flex items-center gap-1">
              <ThemeToggle />
              <Link
                href="/"
                className="inline-flex min-h-11 items-center rounded-lg px-2 text-xs font-medium text-muted transition hover:text-ink"
              >
                Back home
              </Link>
            </div>
          </div>

          <div className="hidden items-center justify-end gap-3 lg:flex">
            <Link href="/" className="text-xs font-medium text-muted transition hover:text-ink">
              Back home
            </Link>
            <ThemeToggle />
          </div>

          <div className="mt-2 rounded-3xl border border-line bg-surface p-5 shadow-[var(--shadow-card)] sm:mt-4 sm:rounded-[28px] sm:p-8 lg:mt-8">
            <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-accent-ink">
              Welcome back
            </p>
            <h2 className="mt-3 font-display text-[28px] font-bold leading-tight tracking-[-0.03em] text-ink sm:text-3xl">
              Log in to VuInn
            </h2>
            <p className="mt-2 text-sm leading-6 text-muted">
              Enter your mobile number to pick up where you left off.
            </p>

            <LoginForm />
          </div>

          <div className="mt-5 text-center sm:mt-6">
            <p className="px-2 text-xs leading-5 text-faint">
              New to VuInn? Your account is created automatically with your first code.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
