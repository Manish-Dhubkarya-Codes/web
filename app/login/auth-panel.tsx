import Image from "next/image";
import Link from "next/link";

const features = [
  { label: "Feed", tone: "bg-violet-400" },
  { label: "Inns", tone: "bg-fuchsia-400" },
  { label: "Videos", tone: "bg-orange-400" },
  { label: "Stories", tone: "bg-sky-400" },
  { label: "Chat", tone: "bg-emerald-400" },
  { label: "Creators", tone: "bg-rose-400" },
];

export function AuthPanel() {
  return (
    <aside className="auth-panel auth-glow relative hidden overflow-hidden border-r border-white/10 lg:flex">
      <div aria-hidden className="auth-grid absolute inset-0 opacity-60" />
      <div className="relative z-10 flex w-full flex-col justify-between p-10 xl:p-14">
        <Link href="/" className="inline-flex w-fit items-center gap-3">
          <Image
            src="/brand/LogoMark.png"
            alt=""
            width={96}
            height={71}
            priority
            className="h-14 w-auto"
          />
          <span className="font-display text-2xl font-bold tracking-tight">VuInn</span>
        </Link>

        <div className="max-w-xl">
          <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-violet-300">
            Watch · Earn · Repeat
          </p>
          <h1 className="mt-5 font-display text-5xl font-bold leading-[0.96] tracking-[-0.045em] xl:text-6xl">
            The whole app.
            <br />
            Now with room
            <br />
            <span className="bg-[linear-gradient(90deg,#B98CFF,#C05BFF,#F9A11B)] bg-clip-text text-transparent">
              to breathe.
            </span>
          </h1>
          <p className="mt-6 max-w-md text-sm leading-7 text-white/45">
            Your feed, Inns, videos, stories, and conversations - built for the bigger screen.
          </p>

          <div className="mt-9 grid max-w-md grid-cols-2 gap-2.5">
            {features.map((feature) => (
              <div
                key={feature.label}
                className="flex items-center gap-2.5 rounded-xl border border-white/10 bg-white/[0.035] px-3.5 py-3 text-xs font-medium text-white/55"
              >
                <span className={`h-1.5 w-1.5 rounded-full ${feature.tone}`} />
                {feature.label}
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2.5 text-xs text-white/30">
          <svg viewBox="0 0 20 20" fill="none" aria-hidden className="h-4 w-4">
            <path
              d="M10 2.7 15.5 5v4.4c0 3.4-2.2 6.2-5.5 7.9-3.3-1.7-5.5-4.5-5.5-7.9V5L10 2.7Z"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinejoin="round"
            />
            <path
              d="m7.4 9.8 1.8 1.8 3.5-3.5"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          Secure sign-in with a one-time code
        </div>
      </div>
    </aside>
  );
}
