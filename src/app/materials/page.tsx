"use client";

import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";

type Material = {
  material_number: string;
  description: string;
  class_code: string;
  material_group: string;
  manufacturer: string;
  mfr_part_no: string;
  plant: string;
  status: string;
  dq_score: number;
  annual_spend: number;
  created_on: string;
};

export default function MaterialsPage() {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [q, setQ] = useState("");
  const [classFilter, setClassFilter] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (classFilter) params.set("class", classFilter);
    const t = setTimeout(() => {
      fetch(`/api/materials?${params}`)
        .then((r) => r.json())
        .then((d) => {
          setMaterials(d.materials);
          setLoading(false);
        });
    }, 200);
    return () => clearTimeout(t);
  }, [q, classFilter]);

  const classOptions = useMemo(() => Array.from(new Set(materials.map((m) => m.class_code))).sort(), [materials]);

  return (
    <div className="flex flex-col gap-4 max-w-[1280px]">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[240px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--muted)" }} />
          <input
            type="search"
            placeholder="Search description, manufacturer, material number, MPN…"
            className="pl-9"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <select value={classFilter} onChange={(e) => setClassFilter(e.target.value)} className="w-[220px]">
          <option value="">All classes</option>
          {classOptions.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <span className="pill pill-neutral">{materials.length} records</span>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-auto max-h-[70vh]">
          <table className="data-table">
            <thead>
              <tr>
                <th>Material #</th>
                <th>Description</th>
                <th>Class</th>
                <th>Manufacturer / MPN</th>
                <th>Plant</th>
                <th>DQ score</th>
                <th>Annual spend</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {materials.map((m) => (
                <tr key={m.material_number}>
                  <td className="font-mono-ui">{m.material_number}</td>
                  <td className="font-medium">{m.description}</td>
                  <td>
                    <span className="pill pill-accent">{m.class_code}</span>
                  </td>
                  <td>
                    <div>{m.manufacturer || "—"}</div>
                    <div className="text-[11px] font-mono-ui" style={{ color: "var(--muted)" }}>
                      {m.mfr_part_no || "no MPN on record"}
                    </div>
                  </td>
                  <td className="text-[12px]" style={{ color: "var(--muted)" }}>{m.plant}</td>
                  <td>
                    <span className={`pill ${m.dq_score >= 85 ? "pill-good" : m.dq_score >= 65 ? "pill-warn" : "pill-bad"}`}>
                      {m.dq_score}
                    </span>
                  </td>
                  <td className="font-mono-ui text-[12px]">₹{m.annual_spend.toLocaleString("en-IN")}</td>
                  <td>
                    <span className={`pill ${m.status === "Active" ? "pill-good" : "pill-bad"}`}>{m.status}</span>
                  </td>
                </tr>
              ))}
              {!loading && materials.length === 0 && (
                <tr>
                  <td colSpan={8} className="text-center py-10" style={{ color: "var(--muted)" }}>
                    No materials match this search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
