import { redirect } from "next/navigation";
import { headers } from "next/headers";

import { apiBaseUrl, getAccessToken } from "@/lib/server/auth";

const REQUEST_TIMEOUT_MS = 20_000;

export class ApiError extends Error {
  readonly status: number;
  readonly data: unknown;

  constructor(status: number, message: string, data?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function messageFrom(status: number, data: unknown): string {
  if (typeof data === "string" && data.trim() && !data.trim().startsWith("<")) {
    return data.trim();
  }

  const record = asRecord(data);
  for (const key of ["message", "error", "title"]) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }

  return `VuInn request failed (${status}).`;
}

async function redirectToRefresh(): Promise<never> {
  const incomingHeaders = await headers();
  const referer = incomingHeaders.get("referer");
  let nextPath = "/home";

  if (referer) {
    try {
      const pathname = new URL(referer).pathname;
      if (pathname.startsWith("/")) nextPath = pathname;
    } catch {
      // Keep the home fallback if the referer is unavailable or malformed.
    }
  }

  redirect(`/api/auth/refresh?next=${encodeURIComponent(nextPath)}`);
}

async function request<T>(
  path: string,
  method: "GET" | "POST" | "DELETE",
  body?: unknown,
): Promise<T> {
  const token = await getAccessToken();
  if (!token) await redirectToRefresh();

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(new URL(path.replace(/^\/+/, ""), apiBaseUrl()), {
      method,
      cache: "no-store",
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        "X-Platform": "web",
        "X-App-Version": "web-0.1.0",
        Authorization: `Bearer ${token}`,
        ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

    const text = await response.text();
    let data: unknown = null;
    if (text) {
      try {
        data = JSON.parse(text);
      } catch {
        data = text;
      }
    }

    if (response.status === 401) await redirectToRefresh();
    if (!response.ok) throw new ApiError(response.status, messageFrom(response.status, data), data);

    return data as T;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (error instanceof Error && error.name === "AbortError") {
      throw new ApiError(504, "VuInn took too long to respond. Please try again.");
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

export function apiGet<T>(path: string): Promise<T> {
  return request<T>(path, "GET");
}

export function apiPost<T>(path: string, body?: unknown): Promise<T> {
  return request<T>(path, "POST", body);
}

export function apiDelete<T>(path: string): Promise<T> {
  return request<T>(path, "DELETE");
}
