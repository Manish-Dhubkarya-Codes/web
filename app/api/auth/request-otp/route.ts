import { NextResponse } from "next/server";

import {
  backendRequest,
  backendMessage,
  friendlyBackendError,
  getOrCreateDeviceId,
  networkErrorMessage,
  normalizePhone,
  setPendingPhone,
} from "@/lib/server/auth";

const ALREADY_EXISTS_RE = /already\s+(exists|registered)|account\s+exists/i;

function errorResponse(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse("Invalid request.");
  }

  const phone = normalizePhone((body as { phone?: unknown } | null)?.phone);
  if (!phone) {
    return errorResponse("Enter a valid 10-digit mobile number.");
  }

  const deviceId = await getOrCreateDeviceId();
  const basePayload = {
    Mobile: phone,
    DeviceId: deviceId,
    DeviceType: "web",
    IsProfilePublic: true,
  };

  let response;
  try {
    response = await backendRequest("auth/register", {
      method: "POST",
      body: JSON.stringify({ ...basePayload, RegisterType: "Signup" }),
    });
  } catch {
    return errorResponse(networkErrorMessage(), 502);
  }

  const needsLogin =
    response.status === 409 ||
    (response.ok && ALREADY_EXISTS_RE.test(backendMessage(response.data) ?? ""));

  if (needsLogin) {
    try {
      response = await backendRequest("auth/register", {
        method: "POST",
        body: JSON.stringify({ ...basePayload, RegisterType: "Login" }),
      });
    } catch {
      return errorResponse(networkErrorMessage(), 502);
    }
  }

  if (!response.ok) {
    return errorResponse(friendlyBackendError(response.status, response.data), response.status);
  }

  const data = response.data as { success?: boolean; message?: string } | null;
  if (data && data.success === false) {
    return errorResponse(data.message?.trim() || "Could not send the code. Please try again.");
  }

  await setPendingPhone(phone);
  return NextResponse.json({ ok: true });
}
