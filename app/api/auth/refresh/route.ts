import { NextResponse } from "next/server";

import { refreshAuthSession } from "@/lib/server/auth";

function safeNext(value: string | null): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/home";
  return value;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const next = safeNext(url.searchParams.get("next"));
  const user = await refreshAuthSession();

  if (!user) {
    return NextResponse.redirect(new URL("/login", url.origin));
  }

  return NextResponse.redirect(new URL(next, url.origin));
}

export async function POST() {
  const user = await refreshAuthSession();
  if (!user) {
    return NextResponse.json({ error: "Your session has expired." }, { status: 401 });
  }
  return NextResponse.json({ ok: true, user });
}
