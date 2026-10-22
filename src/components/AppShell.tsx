"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import { useUser } from "@/hooks/useUser";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading } = useUser();

  // Edge middleware only checks "is there a session cookie" — it can't validate the
  // cookie against the DB-backed sessions table (native SQLite isn't available on the
  // Edge runtime). This is the real validity check: a stale/expired cookie still passes
  // middleware, but /api/auth/me resolves it to null here and we bounce to login.
  useEffect(() => {
    if (pathname !== "/login" && !loading && user === null) {
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
    }
  }, [pathname, loading, user, router]);

  if (pathname === "/login") return <>{children}</>;
  if (loading || !user) return null;

  return (
    <div className="min-h-full flex">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        <Topbar />
        <main className="flex-1 min-w-0 p-6">{children}</main>
      </div>
    </div>
  );
}
