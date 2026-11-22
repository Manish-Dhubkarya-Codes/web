"use client";

import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";

interface VideoVisibilityReport {
  ratio: number;
  top: number;
  isIntersecting: boolean;
}

interface FeedVideoPlaybackValue {
  activeId: string | null;
  report: (id: string, report: VideoVisibilityReport) => void;
  unregister: (id: string) => void;
}

const FeedVideoPlaybackContext = createContext<FeedVideoPlaybackValue | null>(null);

/**
 * Keeps only the most visible feed video active. Every registered video sends
 * its intersection ratio here, and the winner receives activeId === its id.
 */
export function FeedVideoPlaybackProvider({ children }: { children: React.ReactNode }) {
  const entries = useRef(new Map<string, VideoVisibilityReport>());
  const [activeId, setActiveId] = useState<string | null>(null);

  const updateActive = useCallback(() => {
    let next: { id: string; ratio: number; top: number } | null = null;

    for (const [id, entry] of entries.current) {
      if (!entry.isIntersecting || entry.ratio < 0.5) continue;

      if (
        !next ||
        entry.ratio > next.ratio ||
        (entry.ratio === next.ratio && entry.top < next.top)
      ) {
        next = { id, ratio: entry.ratio, top: entry.top };
      }
    }

    const nextId = next?.id ?? null;
    setActiveId((current) => (current === nextId ? current : nextId));
  }, []);

  const report = useCallback(
    (id: string, next: VideoVisibilityReport) => {
      entries.current.set(id, next);
      updateActive();
    },
    [updateActive],
  );

  const unregister = useCallback(
    (id: string) => {
      entries.current.delete(id);
      updateActive();
    },
    [updateActive],
  );

  const value = useMemo(
    () => ({ activeId, report, unregister }),
    [activeId, report, unregister],
  );

  return (
    <FeedVideoPlaybackContext.Provider value={value}>
      {children}
    </FeedVideoPlaybackContext.Provider>
  );
}

export function useFeedVideoPlayback() {
  return useContext(FeedVideoPlaybackContext);
}
