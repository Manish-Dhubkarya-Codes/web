import { NextResponse } from "next/server";

import {
  backendRequest,
  friendlyBackendError,
  getPendingPhone,
  networkErrorMessage,
  setPendingPhone,
} from "@/lib/server/auth";

function errorResponse(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST() {
  const phone = await getPendingPhone();
  if (!phone) {
    return errorResponse("Your code request expired. Please start again.");
  }

  let response;
  try {
    response = await backendRequest("auth/resend-otp", {
      method: "POST",
      body: JSON.stringify({ Target: phone }),
    });
  } catch {
    return errorResponse(networkErrorMessage(), 502);
  }

  if (!response.ok) {
    return errorResponse(friendlyBackendError(response.status, response.data), response.status);
  }

  const data = response.data as { success?: boolean; message?: string } | null;
  if (data && data.success === false) {
    return errorResponse(data.message?.trim() || "Could not resend the code. Please try again.");
  }

  await setPendingPhone(phone);
  return NextResponse.json({ ok: true });
}
