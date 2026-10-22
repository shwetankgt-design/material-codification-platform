"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import StatCard from "@/components/StatCard";
import { ArrowRight, Sparkles, ShieldCheck, TrendingUp } from "lucide-react";

type Analytics = {
  totalMaterials: number;
  avgDq: number;
  blocked: number;
  byClass: { class_code: string; c: number; dq: number; spend: number }[];
  byStatus: { status: string; c: number }[];
  requestsTotal: number;
  duplicatesCaught: number;
  totalSpend: number;
  dqBuckets: { good: number; fair: number; poor: number };
  recentActivity: { action: string; detail: string; actor_name: string; created_at: string; request_id: string }[];
};

export default function DashboardPage() {
  const [data, setData] = useState<Analytics | null>(null);

  useEffect(() => {
    fetch("/api/analytics").then((r) => r.json()).then(setData);
  }, []);

  if (!data) return <div className="p-10 text-sm" style={{ color: "var(--muted)" }}>Loading dashboard…</div>;

  const dupRate = data.requestsTotal ? Math.round((data.duplicatesCaught / data.requestsTotal) * 100) : 0;
  const maxClassCount = Math.max(...data.byClass.map((c) => c.c), 1);

  return (
    <div className="flex flex-col gap-6 max-w-[1280px]">
      <div
        className="rounded-2xl p-6 flex items-center justify-between gap-6 flex-wrap"
        style={{ background: "linear-gradient(135deg, var(--accent) 0%, #1a2470 100%)", color: "#fff" }}
      >
        <div>
          <div className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-wide opacity-80">
            <Sparkles size={14} /> AI-Assisted Governance
          </div>
          <h2 className="text-[22px] font-bold mt-1 max-w-[520px]">
            Every new material request is auto-classified and matched against the master before anyone types a material number.
          </h2>
        </div>
        <Link href="/requests/new" className="btn" style={{ background: "#fff", color: "var(--accent)", borderColor: "#fff" }}>
          Start a request <ArrowRight size={15} />
        </Link>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Materials in master" value={data.totalMaterials.toLocaleString()} sub="Across 10 classes, 4 plants" />
        <StatCard label="Avg. data quality" value={`${data.avgDq}/100`} tone={data.avgDq > 80 ? "good" : "warn"} sub={`${data.blocked} blocked for incomplete data`} />
        <StatCard label="Duplicates avoided" value={`${dupRate}%`} tone="accent" sub={`${data.duplicatesCaught} of ${data.requestsTotal} requests reused existing material`} />
        <StatCard label="Annual spend tracked" value={`₹${(data.totalSpend / 10000000).toFixed(1)} Cr`} sub="Sum across active materials" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="card p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[13.5px] font-semibold">Material master by class</h3>
            <Link href="/materials" className="text-[12px] font-medium flex items-center gap-1" style={{ color: "var(--accent)" }}>
              View all <ArrowRight size={12} />
            </Link>
          </div>
          <div className="flex flex-col gap-3">
            {data.byClass.map((c) => (
              <div key={c.class_code} className="flex items-center gap-3">
                <div className="w-32 text-[12px] font-medium shrink-0 truncate">{c.class_code}</div>
                <div className="flex-1 h-5 rounded-full overflow-hidden" style={{ background: "var(--surface-2)" }}>
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${(c.c / maxClassCount) * 100}%`, background: "var(--accent)" }}
                  />
                </div>
                <div className="w-10 text-right text-[12px] font-mono-ui" style={{ color: "var(--muted)" }}>
                  {c.c}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card p-5">
          <h3 className="text-[13.5px] font-semibold mb-4 flex items-center gap-2">
            <ShieldCheck size={15} /> Data quality distribution
          </h3>
          <div className="flex flex-col gap-3">
            {[
              { label: "Good (85-100)", value: data.dqBuckets.good, tone: "good" },
              { label: "Fair (65-84)", value: data.dqBuckets.fair, tone: "warn" },
              { label: "Poor (<65)", value: data.dqBuckets.poor, tone: "bad" },
            ].map((b) => (
              <div key={b.label} className="flex items-center justify-between">
                <span className={`pill pill-${b.tone}`}>{b.label}</span>
                <span className="font-mono-ui text-[13px] font-semibold">{b.value}</span>
              </div>
            ))}
          </div>
          <p className="text-[11.5px] mt-4" style={{ color: "var(--muted)" }}>
            Score = completeness of mandatory characteristics + manufacturer part number presence.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="card p-5 lg:col-span-2">
          <h3 className="text-[13.5px] font-semibold mb-4 flex items-center gap-2">
            <TrendingUp size={15} /> Request pipeline
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {data.byStatus.map((s) => (
              <div key={s.status} className="rounded-lg p-3" style={{ background: "var(--surface-2)" }}>
                <div className="text-[11px]" style={{ color: "var(--muted)" }}>{s.status}</div>
                <div className="text-[20px] font-bold font-mono-ui mt-0.5">{s.c}</div>
              </div>
            ))}
            {data.byStatus.length === 0 && (
              <div className="text-[13px] col-span-3" style={{ color: "var(--muted)" }}>
                No requests yet — <Link href="/requests/new" className="underline">create the first one</Link>.
              </div>
            )}
          </div>
        </div>

        <div className="card p-5">
          <h3 className="text-[13.5px] font-semibold mb-3">Recent activity</h3>
          <div className="flex flex-col gap-3 max-h-[220px] overflow-y-auto">
            {data.recentActivity.length === 0 && (
              <div className="text-[12px]" style={{ color: "var(--muted)" }}>Nothing yet.</div>
            )}
            {data.recentActivity.map((a, i) => (
              <div key={i} className="text-[12px] border-b pb-2 last:border-0" style={{ borderColor: "var(--line)" }}>
                <div className="font-medium">{a.action}</div>
                <div style={{ color: "var(--muted)" }}>{a.detail}</div>
                <div className="text-[10.5px] mt-0.5" style={{ color: "var(--muted)" }}>
                  {a.actor_name} · {new Date(a.created_at).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
