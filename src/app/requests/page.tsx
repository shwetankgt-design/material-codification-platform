"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

type Req = {
  id: string;
  free_text: string;
  generated_description: string | null;
  status: string;
  class_code: string | null;
  ai_confidence: number | null;
  created_at: string;
  sla_due_at: string;
};

const statusTone: Record<string, string> = {
  Draft: "neutral",
  "Duplicate Review": "warn",
  "Pending Approval": "accent",
  Returned: "bad",
  Approved: "good",
  Rejected: "bad",
  "Created in SAP": "good",
  "Closed - Reused Existing": "neutral",
};

export default function RequestsPage() {
  const [requests, setRequests] = useState<Req[]>([]);
  const [filter, setFilter] = useState("");

  useEffect(() => {
    fetch("/api/requests").then((r) => r.json()).then((d) => setRequests(d.requests));
  }, []);

  const filtered = filter ? requests.filter((r) => r.status === filter) : requests;
  const statuses = Array.from(new Set(requests.map((r) => r.status)));

  return (
    <div className="flex flex-col gap-4 max-w-[1100px]">
      <div className="flex items-center gap-2 flex-wrap">
        <button className={`pill ${filter === "" ? "pill-accent" : "pill-neutral"}`} onClick={() => setFilter("")}>
          All ({requests.length})
        </button>
        {statuses.map((s) => (
          <button
            key={s}
            className={`pill ${filter === s ? "pill-accent" : "pill-neutral"}`}
            onClick={() => setFilter(s)}
          >
            {s} ({requests.filter((r) => r.status === s).length})
          </button>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="card p-10 text-center text-[13px]" style={{ color: "var(--muted)" }}>
          No requests yet. <Link href="/requests/new" className="underline">Create the first one.</Link>
        </div>
      )}

      <div className="flex flex-col gap-3">
        {filtered.map((r) => {
          const overdue = new Date(r.sla_due_at) < new Date() && !["Approved", "Rejected", "Created in SAP", "Closed - Reused Existing"].includes(r.status);
          return (
            <Link key={r.id} href={`/requests/${r.id}`} className="card p-4 flex items-center justify-between gap-4 hover:shadow-sm transition-shadow">
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-mono-ui text-[11.5px]" style={{ color: "var(--muted)" }}>{r.id}</span>
                  <span className={`pill pill-${statusTone[r.status] ?? "neutral"}`}>{r.status}</span>
                  {overdue && <span className="pill pill-bad">SLA overdue</span>}
                  {r.ai_confidence !== null && (
                    <span className="pill pill-neutral">{r.ai_confidence}% AI confidence</span>
                  )}
                </div>
                <div className="font-medium text-[13.5px] truncate">{r.generated_description || r.free_text}</div>
                <div className="text-[11.5px] truncate" style={{ color: "var(--muted)" }}>{r.free_text}</div>
              </div>
              <ArrowRight size={16} style={{ color: "var(--muted)" }} className="shrink-0" />
            </Link>
          );
        })}
      </div>
    </div>
  );
}
