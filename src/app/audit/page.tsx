"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Entry = { request_id: string | null; actor_name: string; action: string; detail: string; created_at: string };

export default function AuditPage() {
  const [entries, setEntries] = useState<Entry[]>([]);

  useEffect(() => {
    fetch("/api/audit").then((r) => r.json()).then((d) => setEntries(d.entries));
  }, []);

  return (
    <div className="max-w-[1000px] card overflow-hidden">
      <table className="data-table">
        <thead>
          <tr>
            <th>Timestamp</th>
            <th>Request</th>
            <th>Actor</th>
            <th>Action</th>
            <th>Detail</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((e, i) => (
            <tr key={i}>
              <td className="text-[11.5px] font-mono-ui" style={{ color: "var(--muted)" }}>
                {new Date(e.created_at).toLocaleString()}
              </td>
              <td>
                {e.request_id ? (
                  <Link href={`/requests/${e.request_id}`} className="font-mono-ui text-[12px] underline">
                    {e.request_id}
                  </Link>
                ) : (
                  <span className="text-[11.5px]" style={{ color: "var(--muted)" }}>
                    —
                  </span>
                )}
              </td>
              <td className="text-[12.5px]">{e.actor_name}</td>
              <td className="text-[12.5px] font-medium">{e.action}</td>
              <td className="text-[12.5px]" style={{ color: "var(--muted)" }}>{e.detail}</td>
            </tr>
          ))}
          {entries.length === 0 && (
            <tr>
              <td colSpan={5} className="text-center py-10" style={{ color: "var(--muted)" }}>
                No activity yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
