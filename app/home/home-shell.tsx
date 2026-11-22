"use client";

import { useState } from "react";

import { Sidebar } from "./sidebar";

export function HomeShell({ children }: { children: React.ReactNode }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="min-h-dvh">
      <Sidebar expanded={expanded} onToggle={() => setExpanded((current) => !current)} />
      <div
        className={`min-h-dvh transition-[padding-left] duration-200 ${
          expanded ? "sm:pl-[248px]" : "sm:pl-[88px]"
        }`}
      >
        {children}
      </div>
    </div>
  );
}
