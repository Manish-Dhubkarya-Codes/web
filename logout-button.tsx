"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function LogoutButton() {
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);

    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      router.replace("/login");
      router.refresh();
    }
  };

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={isLoggingOut}
      className="inline-flex min-h-10 items-center justify-center rounded-full border border-line px-4 text-xs font-semibold text-muted transition hover:border-line-strong hover:text-ink disabled:cursor-not-allowed disabled:opacity-50"
    >
      {isLoggingOut ? "Logging out…" : "Log out"}
    </button>
  );
}
