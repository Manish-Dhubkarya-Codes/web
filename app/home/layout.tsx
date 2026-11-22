import { redirect } from "next/navigation";

import { getSessionUser, hasRefreshToken } from "@/lib/server/auth";

export default async function HomeLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  if (!user) {
    if (await hasRefreshToken()) redirect("/api/auth/refresh?next=/home");
    redirect("/login");
  }

  return children;
}
