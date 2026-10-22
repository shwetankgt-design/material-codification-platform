"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Boxes,
  FilePlus2,
  ListChecks,
  Network,
  Sparkles,
  History,
  Factory,
  UploadCloud,
} from "lucide-react";
import { useUser } from "@/hooks/useUser";

const nav = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard, permission: null },
  { href: "/materials", label: "Material Master", icon: Boxes, permission: null },
  { href: "/materials/import", label: "Bulk Import", icon: UploadCloud, permission: "bulkImport" as const },
  { href: "/requests/new", label: "New Request", icon: FilePlus2, permission: "createRequest" as const },
  { href: "/requests", label: "Request Queue", icon: ListChecks, permission: null },
  { href: "/taxonomy", label: "Taxonomy & Classes", icon: Network, permission: null },
  { href: "/assistant", label: "AI Copilot", icon: Sparkles, permission: null },
  { href: "/audit", label: "Audit Trail", icon: History, permission: "viewAudit" as const },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { user, permissions } = useUser();
  return (
    <aside
      className="w-[228px] shrink-0 flex flex-col"
      style={{ background: "var(--sidebar-bg)", color: "var(--sidebar-ink)" }}
    >
      <div className="flex items-center gap-2 px-5 py-5">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "var(--accent)" }}>
          <Factory size={17} color="#fff" />
        </div>
        <div>
          <div className="text-white font-semibold text-[13.5px] leading-tight">MDM Codify</div>
          <div className="text-[10.5px] opacity-60 leading-tight">Material Governance</div>
        </div>
      </div>

      <nav className="flex-1 px-3 pt-2 flex flex-col gap-1">
        {nav.map((item) => {
          if (item.permission && (!permissions || !permissions[item.permission])) return null;
          const active = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-[13px] font-medium transition-colors"
              style={{
                background: active ? "var(--sidebar-active)" : "transparent",
                color: active ? "#fff" : "var(--sidebar-ink)",
              }}
            >
              <Icon size={16} strokeWidth={2} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="px-4 py-4 mx-3 mb-3 rounded-lg" style={{ background: "rgba(255,255,255,0.05)" }}>
        <div className="text-[10px] uppercase tracking-wide opacity-60 mb-1">Environment</div>
        <div className="text-[12px] text-white font-medium">Prototype · Demo Data</div>
        <div className="text-[10.5px] opacity-50 mt-1">Not connected to live SAP</div>
      </div>
    </aside>
  );
}
