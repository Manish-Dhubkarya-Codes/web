"use client";

import { useId, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

import { digitsOnly, formatNational, isValidNational } from "@/lib/phone";

async function readError(response: Response, fallback: string): Promise<string> {
  const data = (await response.json().catch(() => null)) as { error?: unknown } | null;
  return typeof data?.error === "string" && data.error.trim() ? data.error : fallback;
}

export function LoginForm() {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const inputId = useId();
  const errorId = useId();
  const valid = isValidNational(phone);

  const handleChange = (value: string) => {
    setPhone(digitsOnly(value));
    if (error) setError(null);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!valid) {
      setError("Enter a valid 10-digit mobile number.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/request-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });

      if (!response.ok) {
        throw new Error(await readError(response, "Could not send the code. Please try again."));
      }

      router.push("/login/verify");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send the code. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mt-7 space-y-5 sm:mt-8" noValidate>
      <div>
        <label htmlFor={inputId} className="mb-2 block text-sm font-medium text-body">
          Mobile number
        </label>

        <div
          className={[
            "flex h-[54px] items-center rounded-2xl border bg-field px-3.5 transition sm:h-14 sm:px-4",
            error
              ? "border-danger"
              : "border-field-line focus-within:border-accent focus-within:ring-4 focus-within:ring-accent-soft",
          ].join(" ")}
        >
          <span className="pr-2.5 text-sm font-semibold text-muted sm:pr-3">+91</span>
          <span aria-hidden className="mr-2.5 h-5 w-px bg-line sm:mr-3" />
          <input
            id={inputId}
            name="phone"
            type="tel"
            inputMode="numeric"
            autoComplete="tel-national"
            enterKeyHint="send"
            placeholder="98765 43210"
            value={formatNational(phone)}
            onChange={(event) => handleChange(event.target.value)}
            disabled={isSubmitting}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? errorId : undefined}
            className="h-full min-w-0 flex-1 bg-transparent text-base font-semibold tracking-wide text-ink outline-none placeholder:font-normal placeholder:tracking-normal placeholder:text-faint disabled:opacity-60"
          />
          {valid && !isSubmitting ? (
            <span
              aria-label="Valid mobile number"
              className="ml-2 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-400/15 text-success"
            >
              <svg viewBox="0 0 20 20" fill="none" aria-hidden className="h-3.5 w-3.5">
                <path
                  d="m5 10.5 3.1 3L15 6.8"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
          ) : null}
        </div>

        {error ? (
          <p id={errorId} role="alert" className="mt-2 text-xs leading-5 text-danger">
            {error}
          </p>
        ) : (
          <p className="mt-2 text-xs text-faint">
            We’ll send a 6-digit one-time code. No password needed.
          </p>
        )}
      </div>

      <button
        type="submit"
        disabled={!valid || isSubmitting}
        aria-busy={isSubmitting}
        className="group flex h-[54px] w-full items-center justify-center gap-2 rounded-2xl bg-[linear-gradient(90deg,#7B4DFF,#C05BFF)] px-5 text-sm font-bold text-white shadow-[0_12px_30px_rgba(123,77,255,0.25)] transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-accent-soft active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none sm:h-14"
      >
        {isSubmitting ? (
          <>
            <span
              aria-hidden
              className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white"
            />
            Sending code…
          </>
        ) : (
          <>
            Send OTP
            <svg
              viewBox="0 0 20 20"
              fill="none"
              aria-hidden
              className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
            >
              <path
                d="M4 10h11m-4-4 4 4-4 4"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </>
        )}
      </button>

      <p className="px-1 text-center text-xs leading-5 text-faint">
        By continuing, you agree to VuInn’s Terms and Privacy Policy.
      </p>
    </form>
  );
}
