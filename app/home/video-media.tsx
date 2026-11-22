"use client";

import { useEffect, useId, useRef, useState } from "react";
import type Hls from "hls.js";

import { useFeedVideoPlayback } from "./feed-video-playback";

export function VideoMedia({
  src,
  poster,
  label,
  className = "max-h-[680px] min-h-[220px] w-full bg-black object-contain",
  autoPlay = false,
  autoPlayInView = false,
  muted = false,
  controls = true,
  loop = false,
  onEnded,
  onTimeUpdate,
  onPlaybackChange,
  seekTo,
}: {
  src: string;
  poster?: string;
  label: string;
  className?: string;
  autoPlay?: boolean;
  autoPlayInView?: boolean;
  muted?: boolean;
  controls?: boolean;
  loop?: boolean;
  onEnded?: () => void;
  onTimeUpdate?: (currentTime: number, duration: number) => void;
  onPlaybackChange?: (paused: boolean) => void;
  seekTo?: number;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const isHls = /\.m3u8(\?|$)/i.test(src);
  const feedVideo = useFeedVideoPlayback();
  const registrationId = useId();
  const [isInView, setIsInView] = useState(false);
  const shouldPlay = autoPlayInView
    ? feedVideo
      ? feedVideo.activeId === registrationId
      : isInView
    : autoPlay;
  const shouldPlayRef = useRef(shouldPlay);

  useEffect(() => {
    shouldPlayRef.current = shouldPlay;
  }, [shouldPlay]);

  useEffect(() => {
    if (seekTo === undefined) return;
    const video = videoRef.current;
    if (!video || !Number.isFinite(seekTo)) return;
    if (Math.abs(video.currentTime - seekTo) > 0.25) {
      video.currentTime = seekTo;
    }
  }, [seekTo]);

  const report = feedVideo?.report;
  const unregister = feedVideo?.unregister;

  useEffect(() => {
    if (!autoPlayInView) return;
    const video = videoRef.current;
    if (!video) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const ratio = entry.intersectionRatio;
          setIsInView(entry.isIntersecting && ratio >= 0.5);
          report?.(registrationId, {
            ratio,
            top: entry.boundingClientRect.top,
            isIntersecting: entry.isIntersecting,
          });
        }
      },
      { threshold: [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1] },
    );

    observer.observe(video);
    return () => {
      observer.disconnect();
      unregister?.(registrationId);
    };
  }, [autoPlayInView, registrationId, report, unregister]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (shouldPlay && document.visibilityState !== "hidden") {
      void video.play().catch(() => undefined);
    } else {
      video.pause();
    }
  }, [shouldPlay, src]);

  useEffect(() => {
    function handleVisibilityChange() {
      const video = videoRef.current;
      if (!video) return;

      if (document.visibilityState === "hidden") {
        video.pause();
      } else if (shouldPlayRef.current) {
        void video.play().catch(() => undefined);
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, []);

  useEffect(() => {
    if (!isHls) return;
    const video = videoRef.current;
    if (!video) return;

    let cancelled = false;
    let hls: Hls | null = null;

    void import("hls.js")
      .then(({ default: HlsPlayer }) => {
        if (cancelled || !video) return;

        if (HlsPlayer.isSupported()) {
          hls = new HlsPlayer();
          hls.loadSource(src);
          hls.attachMedia(video);
          if (shouldPlayRef.current) void video.play().catch(() => undefined);
        } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
          video.src = src;
          if (shouldPlayRef.current) void video.play().catch(() => undefined);
        }
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
      hls?.destroy();
    };
  }, [isHls, src]);

  return (
    <video
      ref={videoRef}
      src={isHls ? undefined : src}
      poster={poster}
      controls={controls}
      loop={loop}
      autoPlay={autoPlayInView ? false : autoPlay}
      muted={muted}
      playsInline
      preload="metadata"
      aria-label={label}
      onEnded={onEnded}
      onClick={(event) => {
        const video = event.currentTarget;
        if (video.paused) {
          void video.play().catch(() => undefined);
        } else {
          video.pause();
        }
      }}
      onPlay={() => onPlaybackChange?.(false)}
      onPause={() => onPlaybackChange?.(true)}
      onTimeUpdate={
        onTimeUpdate
          ? (event) => {
              const video = event.currentTarget;
              onTimeUpdate(video.currentTime, video.duration);
            }
          : undefined
      }
      className={className}
    />
  );
}
