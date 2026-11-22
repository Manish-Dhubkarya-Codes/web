import { NextResponse } from "next/server";

import { getSessionUser, refreshAuthSession } from "@/lib/server/auth";

export async function GET() {
  const user = await getSessionUser();
  if (user) return NextResponse.json({ user });

  const refreshed = await refreshAuthSession();
  if (refreshed) return NextResponse.json({ user: refreshed });

  return NextResponse.json({ error: "Not signed in." }, { status: 401 });
}
