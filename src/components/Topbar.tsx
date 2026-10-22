"use client";

import { usePathname } from "next/navigation";
import { LogOut } from "lucide-react";
import { useUser } from "@/hooks/useUser";

const titles: Record<string, string> = {
  "/": "Dashboard",
  "/materials": "Material Master",
  "/materials/import": "Bulk Import",
  "/requests": "Request Queue",
  "/requests/new": "New Codification Request",
  "/taxonomy": "Taxonomy & Classification",
  "/assistant": "AI Copilot",
  "/audit": "Audit Trail",
};

function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export default function Topbar() {
  const pathname = usePathname();
  const { user } = useUser();
  const title =
    titles[pathname] ??
    (pathname.startsWith("/requests/") ? "Request Detail" : "MDM Codify");

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  }

  return (
    <header
      className="h-16 flex items-center justify-between px-6 shrink-0"
      style={{ background: "var(--surface)", borderBottom: "1px solid var(--line)" }}
    >
      <div>
        <h1 className="text-[16px] font-semibold">{title}</h1>
      </div>
      <div className="flex items-center gap-3">
        <div className="hidden md:flex items-center gap-2 pill pill-neutral">
          <span className="live-dot" />
          Connected to local DB
        </div>
        {user && (
          <div className="flex items-center gap-2 pl-3 border-l" style={{ borderColor: "var(--line)" }}>
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-[12px] font-semibold text-white"
              style={{ background: "var(--accent)" }}
            >
              {initials(user.name)}
            </div>
            <div className="text-[12.5px] leading-tight">
              <div className="font-medium">{user.name}</div>
              <div className="text-[10.5px]" style={{ color: "var(--muted)" }}>
                {user.role}
              </div>
            </div>
            <button
              onClick={logout}
              title="Sign out"
              className="ml-1 p-1.5 rounded-md hover:bg-black/5"
              style={{ color: "var(--muted)" }}
            >
              <LogOut size={14} />
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
