import { NextResponse } from "next/server";

import {
  backendRequest,
  clearPendingPhone,
  friendlyBackendError,
  getOrCreateDeviceId,
  getPendingPhone,
  networkErrorMessage,
  readAuthTokens,
  sessionUserFromToken,
  setAuthCookies,
} from "@/lib/server/auth";

function errorResponse(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(request: Request) {
  const phone = await getPendingPhone();
  if (!phone) {
    return errorResponse("Your code expired. Please start again.");
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse("Invalid request.");
  }

  const code = String((body as { code?: unknown } | null)?.code ?? "").replace(/\D/g, "");
  if (code.length !== 6) {
    return errorResponse("Enter the 6-digit code.");
  }

  const deviceId = await getOrCreateDeviceId();

  let response;
  try {
    response = await backendRequest("auth/verify-otp", {
      method: "POST",
      body: JSON.stringify({
        Target: phone,
        Code: code,
        DeviceId: deviceId,
        DeviceType: "web",
      }),
    });
  } catch {
    return errorResponse(networkErrorMessage(), 502);
  }

  if (!response.ok) {
    return errorResponse(friendlyBackendError(response.status, response.data), response.status);
  }

  const tokens = readAuthTokens(response.data);
  if (!tokens) {
    return errorResponse("The server did not return a valid session. Please try again.", 502);
  }

  const user = sessionUserFromToken(tokens.accessToken, phone, tokens.userName);
  if (!user) {
    return errorResponse("The server returned a session that could not be read. Please try again.", 502);
  }

  await setAuthCookies(tokens, phone, tokens.userName);
  await clearPendingPhone();

  return NextResponse.json({ ok: true, user });
}
