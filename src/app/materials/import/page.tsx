"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { UploadCloud, Download, Loader2, CheckCircle2, XCircle, ShieldAlert } from "lucide-react";
import { useUser } from "@/hooks/useUser";
import { classes } from "@/lib/taxonomy-data";
import { parseCsv, rowsToObjects } from "@/lib/csv";

type PreviewRow = {
  rowNumber: number;
  raw: Record<string, string>;
  values: Record<string, string>;
  manufacturer: string;
  mfrPartNo: string;
  plant: string;
  description: string;
  dqScore: number;
  errors: string[];
  ok: boolean;
};

export default function BulkImportPage() {
  const router = useRouter();
  const { user, permissions, loading } = useUser();
  const [classCode, setClassCode] = useState(classes[0].code);
  const [fileName, setFileName] = useState("");
  const [parsedRows, setParsedRows] = useState<Record<string, string>[]>([]);
  const [preview, setPreview] = useState<{ total: number; validCount: number; invalidCount: number; rows: PreviewRow[] } | null>(null);
  const [checking, setChecking] = useState(false);
  const [committing, setCommitting] = useState(false);
  const [result, setResult] = useState<{ createdCount: number; rejectedCount: number; batchId: string } | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  if (!loading && permissions && !permissions.bulkImport) {
    return (
      <div className="card p-10 max-w-[560px] text-center flex flex-col items-center gap-3">
        <ShieldAlert size={28} style={{ color: "var(--bad)" }} />
        <h2 className="text-[15px] font-semibold">Not authorized</h2>
        <p className="text-[13px]" style={{ color: "var(--muted)" }}>
          Bulk import is restricted to Admin and Category Owner roles. Signed in as {user?.name} ({user?.role}).
        </p>
      </div>
    );
  }

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setResult(null);
    const reader = new FileReader();
    reader.onload = () => {
      const text = reader.result as string;
      const rows = rowsToObjects(parseCsv(text));
      setParsedRows(rows);
      setPreview(null);
    };
    reader.readAsText(file);
  }

  async function runValidation() {
    setChecking(true);
    const res = await fetch("/api/materials/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ classCode, rows: parsedRows, commit: false }),
    });
    const data = await res.json();
    setPreview(data);
    setChecking(false);
  }

  async function commitImport() {
    setCommitting(true);
    const res = await fetch("/api/materials/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ classCode, rows: parsedRows, commit: true, filename: fileName }),
    });
    const data = await res.json();
    setCommitting(false);
    if (res.ok) {
      setResult(data);
      setParsedRows([]);
      setPreview(null);
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  return (
    <div className="max-w-[1000px] flex flex-col gap-5">
      <div className="card p-5">
        <div className="flex items-center gap-2 mb-1">
          <UploadCloud size={16} style={{ color: "var(--accent)" }} />
          <h2 className="text-[14px] font-semibold">Bulk material import</h2>
        </div>
        <p className="text-[12.5px] mb-4" style={{ color: "var(--muted)" }}>
          Mass-load materials straight into the master, same validation rules as a single request: mandatory
          characteristics, numeric/enum checks, and a duplicate check against the live database. One class per file —
          download its template to get the exact columns.
        </p>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="field-label">1. Choose class</label>
            <select value={classCode} onChange={(e) => { setClassCode(e.target.value); setPreview(null); setParsedRows([]); }}>
              {classes.map((c) => (
                <option key={c.code} value={c.code}>{c.name} ({c.code})</option>
              ))}
            </select>
            <a
              href={`/api/materials/template?class=${classCode}`}
              className="btn mt-2 w-fit"
              download
            >
              <Download size={13} /> Download CSV template
            </a>
          </div>

          <div>
            <label className="field-label">2. Upload filled CSV</label>
            <input ref={fileInput} type="file" accept=".csv" onChange={onFile} className="text-[12.5px]" />
            {fileName && (
              <div className="text-[12px] mt-2" style={{ color: "var(--muted)" }}>
                {fileName} — {parsedRows.length} row(s) parsed
              </div>
            )}
          </div>
        </div>

        {parsedRows.length > 0 && !preview && (
          <button className="btn btn-primary mt-4" disabled={checking} onClick={runValidation}>
            {checking && <Loader2 size={14} className="animate-spin" />} Validate {parsedRows.length} rows
          </button>
        )}
      </div>

      {result && (
        <div className="card p-5 flex items-center gap-3" style={{ background: "var(--good-soft)" }}>
          <CheckCircle2 size={22} style={{ color: "var(--good)" }} />
          <div>
            <div className="font-semibold text-[13.5px]" style={{ color: "var(--good)" }}>
              Import {result.batchId} complete — {result.createdCount} material(s) created
            </div>
            <div className="text-[12px]" style={{ color: "var(--muted)" }}>
              {result.rejectedCount} row(s) rejected and skipped. <button className="underline" onClick={() => router.push("/materials")}>View in Material Master →</button>
            </div>
          </div>
        </div>
      )}

      {preview && (
        <div className="card p-5">
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <h3 className="text-[13.5px] font-semibold">Validation preview</h3>
            <div className="flex gap-2">
              <span className="pill pill-good">{preview.validCount} valid</span>
              <span className="pill pill-bad">{preview.invalidCount} rejected</span>
            </div>
          </div>

          <div className="overflow-auto max-h-[420px]">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Row</th>
                  <th>Generated description</th>
                  <th>Manufacturer</th>
                  <th>DQ</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {preview.rows.map((r) => (
                  <tr key={r.rowNumber}>
                    <td className="font-mono-ui">{r.rowNumber}</td>
                    <td>
                      {r.ok ? (
                        <span className="font-mono-ui font-medium">{r.description}</span>
                      ) : (
                        <span className="text-[11.5px]" style={{ color: "var(--bad)" }}>
                          {r.errors.join(" · ")}
                        </span>
                      )}
                    </td>
                    <td className="text-[12px]">{r.manufacturer || "—"}</td>
                    <td>{r.ok && <span className={`pill ${r.dqScore >= 85 ? "pill-good" : r.dqScore >= 65 ? "pill-warn" : "pill-bad"}`}>{r.dqScore}</span>}</td>
                    <td>
                      {r.ok ? (
                        <span className="pill pill-good flex items-center gap-1 w-fit"><CheckCircle2 size={11} /> Ready</span>
                      ) : (
                        <span className="pill pill-bad flex items-center gap-1 w-fit"><XCircle size={11} /> Rejected</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {preview.validCount > 0 && (
            <button className="btn btn-primary mt-4" disabled={committing} onClick={commitImport}>
              {committing && <Loader2 size={14} className="animate-spin" />} Commit {preview.validCount} valid material(s) to SAP master
            </button>
          )}
        </div>
      )}
    </div>
  );
}
