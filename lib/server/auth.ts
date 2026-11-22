import { cookies } from "next/headers";

const DEFAULT_API_BASE_URL = "http://localhost:3000/api/v1/";

export const AUTH_COOKIES = {
  access: "vuinn_access",
  refresh: "vuinn_refresh",
  phone: "vuinn_phone",
  name: "vuinn_name",
  pendingPhone: "vuinn_pending_phone",
  deviceId: "vuinn_device_id",
} as const;

const ACCESS_FALLBACK_MAX_AGE = 60 * 60;
const REFRESH_MAX_AGE = 60 * 60 * 24 * 30;
const PENDING_MAX_AGE = 60 * 10;
const DEVICE_MAX_AGE = 60 * 60 * 24 * 365;

export interface SessionUser {
  id: string;
  phoneNumber: string;
  name?: string;
}

export interface BackendResult {
  status: number;
  ok: boolean;
  data: unknown;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  userName?: string;
}

export function apiBaseUrl(): string {
  const raw =
    process.env.API_BASE_URL ??
    process.env.NEXT_PUBLIC_API_BASE_URL ??
    DEFAULT_API_BASE_URL;
  return raw.endsWith("/") ? raw : `${raw}/`;
}

export function normalizePhone(input: unknown): string | null {
  const digits = String(input ?? "").replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("91")) return digits.slice(2);
  if (digits.length === 11 && digits.startsWith("0")) return digits.slice(1);
  return digits.length === 10 ? digits : null;
}

export async function backendRequest(
  path: string,
  init: Omit<RequestInit, "headers"> & { headers?: Record<string, string> } = {},
): Promise<BackendResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20_000);

  try {
    const url = new URL(path.replace(/^\/+/, ""), apiBaseUrl());
    const response = await fetch(url, {
      ...init,
      cache: "no-store",
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "X-Platform": "web",
        "X-App-Version": "web-0.1.0",
        ...init.headers,
      },
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

    return { status: response.status, ok: response.ok, data };
  } finally {
    clearTimeout(timer);
  }
}

export function backendMessage(data: unknown): string | null {
  if (typeof data === "string") {
    const value = data.trim();
    return value && value.length <= 300 && !value.startsWith("<") ? value : null;
  }

  if (!data || typeof data !== "object" || Array.isArray(data)) return null;

  const record = data as Record<string, unknown>;
  for (const key of ["message", "title", "error"]) {
    const value = record[key];
    if (typeof value === "string") {
      const message = value.trim();
      if (message && message.length <= 300 && !message.startsWith("<")) return message;
    }
  }

  const errors = record.errors;
  if (errors && typeof errors === "object") {
    const first = Object.values(errors)[0];
    const message = Array.isArray(first) ? first[0] : first;
    if (typeof message === "string") {
      const value = message.trim();
      if (value && value.length <= 300 && !value.startsWith("<")) return value;
    }
  }

  return null;
}

export function friendlyBackendError(status: number, data: unknown): string {
  const message = backendMessage(data);
  if (message) return message;

  switch (status) {
    case 429:
      return "Too many attempts. Please wait a moment and try again.";
    case 401:
      return "That code or session is no longer valid. Please try again.";
    case 403:
      return "You do not have permission to do that.";
    case 404:
      return "That could not be found.";
    case 409:
      return "That account already exists.";
    case 400:
    case 422:
      return "That request was invalid. Please check and try again.";
    default:
      return status >= 500
        ? "Our servers are having trouble right now. Please try again in a moment."
        : `Something went wrong (${status}). Please try again.`;
  }
}

export function networkErrorMessage(): string {
  return "Could not reach VuInn. Please check your connection and try again.";
}

export function unwrapData(data: unknown): Record<string, unknown> {
  if (!data || typeof data !== "object" || Array.isArray(data)) return {};
  const record = data as Record<string, unknown>;
  const nested = record.data;
  if (nested && typeof nested === "object" && !Array.isArray(nested)) {
    return nested as Record<string, unknown>;
  }
  return record;
}

export function readAuthTokens(data: unknown): AuthTokens | null {
  const record = unwrapData(data);
  const accessToken = record.token ?? record.Token ?? record.accessToken ?? record.AccessToken;
  const refreshToken = record.refreshToken ?? record.RefreshToken;
  const userName = record.userName ?? record.UserName;

  if (typeof accessToken !== "string" || !accessToken) return null;
  if (typeof refreshToken !== "string" || !refreshToken) return null;

  return {
    accessToken,
    refreshToken,
    userName: typeof userName === "string" ? userName : undefined,
  };
}

interface JwtPayload {
  exp?: number;
  nameid?: string;
  [key: string]: unknown;
}

const NAME_ID_URI_CLAIM =
  "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier";

export function decodeJwtPayload(token: string): JwtPayload | null {
  try {
    const part = token.split(".")[1];
    if (!part) return null;
    const base64 = part.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
    return JSON.parse(atob(padded)) as JwtPayload;
  } catch {
    return null;
  }
}

export function isTokenExpired(token: string | null | undefined, leewaySeconds = 30): boolean {
  if (!token) return true;
  const payload = decodeJwtPayload(token);
  if (!payload || typeof payload.exp !== "number") return false;
  return payload.exp * 1000 - leewaySeconds * 1000 <= Date.now();
}

export function sessionUserFromToken(
  token: string,
  phoneNumber: string,
  name?: string,
): SessionUser | null {
  const payload = decodeJwtPayload(token);
  const id = payload?.nameid ?? payload?.[NAME_ID_URI_CLAIM];
  if (typeof id !== "string" || !id) return null;
  return { id, phoneNumber, name };
}

function cookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge,
  };
}

export async function setPendingPhone(phone: string): Promise<void> {
  (await cookies()).set(AUTH_COOKIES.pendingPhone, phone, cookieOptions(PENDING_MAX_AGE));
}

export async function getPendingPhone(): Promise<string | null> {
  const value = (await cookies()).get(AUTH_COOKIES.pendingPhone)?.value;
  return normalizePhone(value);
}

export async function clearPendingPhone(): Promise<void> {
  (await cookies()).set(AUTH_COOKIES.pendingPhone, "", cookieOptions(0));
}

export async function getOrCreateDeviceId(): Promise<string> {
  const store = await cookies();
  const existing = store.get(AUTH_COOKIES.deviceId)?.value;
  if (existing) return existing;

  const deviceId = crypto.randomUUID();
  store.set(AUTH_COOKIES.deviceId, deviceId, cookieOptions(DEVICE_MAX_AGE));
  return deviceId;
}

export async function setAuthCookies(
  tokens: AuthTokens,
  phoneNumber: string,
  name?: string,
): Promise<void> {
  const store = await cookies();
  const expiry = decodeJwtPayload(tokens.accessToken)?.exp;
  const accessMaxAge =
    typeof expiry === "number"
      ? Math.max(60, expiry - Math.floor(Date.now() / 1000))
      : ACCESS_FALLBACK_MAX_AGE;

  store.set(AUTH_COOKIES.access, tokens.accessToken, cookieOptions(accessMaxAge));
  store.set(AUTH_COOKIES.refresh, tokens.refreshToken, cookieOptions(REFRESH_MAX_AGE));
  store.set(AUTH_COOKIES.phone, phoneNumber, cookieOptions(REFRESH_MAX_AGE));

  if (name) {
    store.set(AUTH_COOKIES.name, name, cookieOptions(REFRESH_MAX_AGE));
  } else {
    store.set(AUTH_COOKIES.name, "", cookieOptions(0));
  }
}

export async function clearAuthCookies(): Promise<void> {
  const store = await cookies();
  for (const name of [
    AUTH_COOKIES.access,
    AUTH_COOKIES.refresh,
    AUTH_COOKIES.phone,
    AUTH_COOKIES.name,
    AUTH_COOKIES.pendingPhone,
  ]) {
    store.set(name, "", cookieOptions(0));
  }
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const store = await cookies();
  const accessToken = store.get(AUTH_COOKIES.access)?.value;
  if (!accessToken || isTokenExpired(accessToken)) return null;

  const phoneNumber = store.get(AUTH_COOKIES.phone)?.value ?? "";
  const name = store.get(AUTH_COOKIES.name)?.value;
  return sessionUserFromToken(accessToken, phoneNumber, name);
}

export async function getAccessToken(): Promise<string | null> {
  return (await cookies()).get(AUTH_COOKIES.access)?.value ?? null;
}

export async function hasRefreshToken(): Promise<boolean> {
  return Boolean((await cookies()).get(AUTH_COOKIES.refresh)?.value);
}

export async function refreshAuthSession(): Promise<SessionUser | null> {
  const store = await cookies();
  const accessToken = store.get(AUTH_COOKIES.access)?.value;
  const refreshToken = store.get(AUTH_COOKIES.refresh)?.value;
  if (!accessToken || !refreshToken) return null;

  try {
    const response = await backendRequest("auth/refresh-token", {
      method: "POST",
      body: JSON.stringify({ Token: accessToken, RefreshToken: refreshToken }),
    });

    if (!response.ok) {
      await clearAuthCookies();
      return null;
    }

    const tokens = readAuthTokens(response.data);
    if (!tokens) {
      await clearAuthCookies();
      return null;
    }

    const phoneNumber = store.get(AUTH_COOKIES.phone)?.value ?? "";
    const name = tokens.userName ?? store.get(AUTH_COOKIES.name)?.value;
    const user = sessionUserFromToken(tokens.accessToken, phoneNumber, name);
    if (!user) {
      await clearAuthCookies();
      return null;
    }

    await setAuthCookies(tokens, phoneNumber, name);
    return user;
  } catch {
    return null;
  }
}
