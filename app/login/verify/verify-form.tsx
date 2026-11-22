"use client";

import { useEffect, useRef, useState, type ClipboardEvent, type KeyboardEvent } from "react";
import { useRouter } from "next/navigation";

const OTP_LENGTH = 6;
const RESEND_SECONDS = 60;

async function readError(response: Response, fallback: string): Promise<string> {
  const data = (await response.json().catch(() => null)) as { error?: unknown } | null;
  return typeof data?.error === "string" && data.error.trim() ? data.error : fallback;
}

export function VerifyForm() {
  const router = useRouter();
  const [digits, setDigits] = useState<string[]>(() => Array(OTP_LENGTH).fill(""));
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(RESEND_SECONDS);
  const [resendMessage, setResendMessage] = useState<string | null>(null);

  const inputs = useRef<Array<HTMLInputElement | null>>([]);
  const submittingRef = useRef(false);

  useEffect(() => {
    if (cooldown <= 0) return undefined;
    const timer = setTimeout(() => setCooldown((seconds) => Math.max(0, seconds - 1)), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const submit = async (code: string) => {
    if (submittingRef.current || code.length !== OTP_LENGTH) return;

    submittingRef.current = true;
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });

      if (!response.ok) {
        throw new Error(
          await readError(response, "That code didn’t work. Check the digits and try again."),
        );
      }

      router.replace("/home");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "That code didn’t work. Please try again.");
      setDigits(Array(OTP_LENGTH).fill(""));
      inputs.current[0]?.focus();
    } finally {
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  const handleDigits = (start: number, raw: string) => {
    const clean = raw.replace(/\D/g, "").slice(0, OTP_LENGTH);
    if (!clean) {
      setDigits((current) => {
        const next = [...current];
        next[start] = "";
        return next;
      });
      return;
    }

    const next = [...digits];
    for (let index = 0; index < clean.length && start + index < OTP_LENGTH; index += 1) {
      next[start + index] = clean[index];
    }

    setDigits(next);
    setError(null);

    const nextIndex = Math.min(start + clean.length, OTP_LENGTH - 1);
    inputs.current[nextIndex]?.focus();

    const code = next.join("");
    if (code.length === OTP_LENGTH) void submit(code);
  };

  const handleKeyDown = (index: number, event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Backspace" && !digits[index] && index > 0) {
      event.preventDefault();
      setDigits((current) => {
        const next = [...current];
        next[index - 1] = "";
        return next;
      });
      inputs.current[index - 1]?.focus();
      return;
    }

    if (event.key === "ArrowLeft" && index > 0) {
      event.preventDefault();
      inputs.current[index - 1]?.focus();
    }

    if (event.key === "ArrowRight" && index < OTP_LENGTH - 1) {
      event.preventDefault();
      inputs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (index: number, event: ClipboardEvent<HTMLInputElement>) => {
    event.preventDefault();
    handleDigits(index, event.clipboardData.getData("text"));
  };

  const handleResend = async () => {
    if (cooldown > 0 || resending) return;

    setResending(true);
    setError(null);
    setResendMessage(null);

    try {
      const response = await fetch("/api/auth/resend-otp", { method: "POST" });
      if (!response.ok) {
        throw new Error(await readError(response, "Could not resend the code. Please try again."));
      }

      setCooldown(RESEND_SECONDS);
      setResendMessage("A new code is on its way.");
      setDigits(Array(OTP_LENGTH).fill(""));
      inputs.current[0]?.focus();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not resend the code. Please try again.");
    } finally {
      setResending(false);
    }
  };

  const code = digits.join("");
  const complete = code.length === OTP_LENGTH;

  return (
    <div className="mt-7 sm:mt-8">
      <div className="grid grid-cols-6 gap-1.5 sm:gap-2">
        {digits.map((digit, index) => (
          <input
            key={index}
            ref={(node) => {
              inputs.current[index] = node;
            }}
            value={digit}
            onChange={(event) => handleDigits(index, event.target.value)}
            onKeyDown={(event) => handleKeyDown(index, event)}
            onPaste={(event) => handlePaste(index, event)}
            onFocus={(event) => event.currentTarget.select()}
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={1}
            autoComplete={index === 0 ? "one-time-code" : "off"}
            aria-label={`Digit ${index + 1} of ${OTP_LENGTH}`}
            disabled={isSubmitting}
            autoFocus={index === 0}
            className="h-[52px] w-full rounded-xl border border-field-line bg-field text-center font-display text-xl font-bold text-ink outline-none transition focus:border-accent focus:ring-4 focus:ring-accent-soft disabled:opacity-50 sm:h-14 sm:rounded-2xl sm:text-2xl"
          />
        ))}
      </div>

      {error ? (
        <p role="alert" className="mt-3 text-xs leading-5 text-danger">
          {error}
        </p>
      ) : (
        <p className="mt-3 text-xs text-faint">Enter the 6-digit code we sent you.</p>
      )}

      <button
        type="button"
        onClick={() => void submit(code)}
        disabled={!complete || isSubmitting}
        aria-busy={isSubmitting}
        className="group mt-6 flex h-[54px] w-full items-center justify-center gap-2 rounded-2xl bg-[linear-gradient(90deg,#7B4DFF,#C05BFF)] px-5 text-sm font-bold text-white shadow-[0_12px_30px_rgba(123,77,255,0.25)] transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-accent-soft active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none sm:h-14"
      >
        {isSubmitting ? (
          <>
            <span
              aria-hidden
              className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white"
            />
            Verifying…
          </>
        ) : (
          <>
            Verify &amp; continue
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

      <div className="mt-5 text-center">
        {cooldown > 0 ? (
          <p className="text-xs text-faint">
            Resend code in{" "}
            <span className="font-semibold text-accent-ink">
              00:{cooldown.toString().padStart(2, "0")}
            </span>
          </p>
        ) : (
          <button
            type="button"
            onClick={handleResend}
            disabled={resending || isSubmitting}
            className="inline-flex min-h-11 items-center rounded-lg px-3 text-xs font-semibold text-accent-ink transition hover:text-accent disabled:cursor-not-allowed disabled:opacity-50"
          >
            {resending ? "Sending…" : "Resend code"}
          </button>
        )}
      </div>

      {resendMessage ? (
        <p role="status" className="mt-2 text-center text-xs text-success">
          {resendMessage}
        </p>
      ) : null}
    </div>
  );
}
