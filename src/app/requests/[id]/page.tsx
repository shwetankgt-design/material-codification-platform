"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { useUser } from "@/hooks/useUser";
import {
  Loader2,
  SearchCheck,
  CheckCircle2,
  XCircle,
  CornerUpLeft,
  Rocket,
  PackageCheck,
} from "lucide-react";

type RequestDetail = {
  id: string;
  free_text: string;
  class_code: string | null;
  characteristics: Record<string, string>;
  generated_description: string | null;
  status: string;
  duplicate_decision: string | null;
  reused_material_number: string | null;
  ai_confidence: number | null;
  sap_material_number: string | null;
  mfr_part_no: string | null;
};

type Match = {
  materialNumber: string;
  description: string;
  manufacturer: string;
  plant: string;
  blendedScore: number;
  matchReason: string;
};

type AuditEntry = { action: string; detail: string; actor_name: string; created_at: string };

const steps = ["Draft", "Duplicate Review", "Pending Approval", "Approved", "Created in SAP"];

export default function RequestDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { permissions } = useUser();
  const [data, setData] = useState<{ request: RequestDetail; audit: AuditEntry[]; matches: Match[] } | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [mpn, setMpn] = useState("");
  const [checking, setChecking] = useState(false);
  const [matches, setMatches] = useState<Match[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [comment, setComment] = useState("");

  const load = useCallback(() => {
    fetch(`/api/requests/${id}`).then((r) => r.json()).then((d) => {
      if (!d.request) {
        setNotFound(true);
        return;
      }
      setData(d);
      setMpn(d.request.mfr_part_no ?? "");
      if (d.matches?.length) {
        setMatches(
          d.matches.map((m: any) => ({
            materialNumber: m.material_number,
            description: "",
            manufacturer: "",
            plant: "",
            blendedScore: m.similarity_score,
            matchReason: m.match_reason,
          }))
        );
      }
    });
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  if (notFound) {
    return (
      <div className="card p-10 max-w-[560px] text-center">
        <h2 className="text-[15px] font-semibold mb-2">Request not found</h2>
        <p className="text-[13px]" style={{ color: "var(--muted)" }}>
          There&apos;s no request with id <span className="font-mono-ui">{id}</span>. It may have been deleted, or the
          link may be stale.
        </p>
      </div>
    );
  }
  if (!data) return <div className="p-10 text-sm" style={{ color: "var(--muted)" }}>Loading…</div>;
  const { request } = data;

  async function saveMpn() {
    await fetch(`/api/requests/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mfrPartNo: mpn }),
    });
    load();
  }

  async function runDuplicateCheck() {
    setChecking(true);
    const res = await fetch(`/api/requests/${id}/duplicates`, { method: "POST" });
    const d = await res.json();
    setMatches(d.matches);
    setChecking(false);
    load();
  }

  async function decide(decision: "Reuse" | "ConfirmedNew", materialNumber?: string) {
    setBusy(true);
    await fetch(`/api/requests/${id}/decide`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ decision, materialNumber }),
    });
    setBusy(false);
    load();
  }

  async function approve(action: "Approve" | "Reject" | "Return") {
    setBusy(true);
    await fetch(`/api/requests/${id}/approve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, comment }),
    });
    setComment("");
    setBusy(false);
    load();
  }

  async function createInSap() {
    setBusy(true);
    await fetch(`/api/requests/${id}/create-sap`, { method: "POST" });
    setBusy(false);
    load();
  }

  const stepIndex = steps.indexOf(request.status);

  return (
    <div className="max-w-[980px] flex flex-col gap-5">
      {/* progress rail */}
      <div className="card p-4 flex items-center gap-1 overflow-x-auto">
        {steps.map((s, i) => (
          <div key={s} className="flex items-center gap-1 shrink-0">
            <div
              className="px-3 py-1.5 rounded-full text-[11.5px] font-semibold whitespace-nowrap"
              style={{
                background: i <= stepIndex && stepIndex >= 0 ? "var(--accent)" : "var(--surface-2)",
                color: i <= stepIndex && stepIndex >= 0 ? "#fff" : "var(--muted)",
              }}
            >
              {s}
            </div>
            {i < steps.length - 1 && <div className="w-5 h-px" style={{ background: "var(--line)" }} />}
          </div>
        ))}
        <div className="ml-auto">
          <span className="pill pill-neutral font-mono-ui">{request.id}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 flex flex-col gap-5">
          {/* request summary */}
          <div className="card p-5">
            <div className="text-[11.5px] font-semibold uppercase tracking-wide mb-1" style={{ color: "var(--muted)" }}>
              Original request
            </div>
            <p className="text-[13.5px] mb-3">{request.free_text}</p>
            <div className="flex flex-wrap gap-2 mb-4">
              <span className="pill pill-accent">{request.class_code}</span>
              {request.ai_confidence !== null && <span className="pill pill-neutral">{request.ai_confidence}% AI confidence</span>}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-4">
              {Object.entries(request.characteristics).map(([k, v]) => (
                <div key={k} className="rounded-lg p-2.5" style={{ background: "var(--surface-2)" }}>
                  <div className="text-[10px] uppercase" style={{ color: "var(--muted)" }}>{k}</div>
                  <div className="text-[12.5px] font-semibold font-mono-ui">{v}</div>
                </div>
              ))}
            </div>

            <label className="field-label">Manufacturer part number (mandatory gate)</label>
            <div className="flex gap-2">
              <input type="text" value={mpn} onChange={(e) => setMpn(e.target.value)} placeholder="Type MPN…" />
              <button className="btn" onClick={saveMpn}>Save</button>
            </div>

            {request.generated_description && (
              <div className="mt-4 rounded-lg p-4" style={{ background: "var(--accent-soft)" }}>
                <div className="text-[10.5px] uppercase tracking-wide mb-1" style={{ color: "var(--accent)" }}>
                  Standardized description (rule-generated)
                </div>
                <div className="font-mono-ui font-bold text-[16px]" style={{ color: "var(--accent)" }}>
                  {request.generated_description}
                </div>
              </div>
            )}
          </div>

          {/* duplicate check */}
          <div className="card p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[13.5px] font-semibold flex items-center gap-2">
                <SearchCheck size={15} /> Duplicate check
              </h3>
              <button className="btn" onClick={runDuplicateCheck} disabled={checking || !mpn}>
                {checking ? <Loader2 size={14} className="animate-spin" /> : null}
                Run AI duplicate search
              </button>
            </div>
            {!mpn && <p className="text-[12px]" style={{ color: "var(--warn)" }}>Save an MPN above before running the check.</p>}

            {matches && matches.length === 0 && (
              <div className="text-[13px] flex items-center gap-2 pill-good pill p-3 w-fit">
                <CheckCircle2 size={14} /> No close matches found — safe to proceed.
              </div>
            )}

            {matches && matches.length > 0 && (
              <div className="flex flex-col gap-2 mt-2">
                {matches.map((m) => (
                  <div key={m.materialNumber} className="rounded-lg p-3 border" style={{ borderColor: m.blendedScore > 0.55 ? "var(--warn)" : "var(--line)", background: m.blendedScore > 0.55 ? "var(--warn-soft)" : "var(--surface-2)" }}>
                    <div className="flex items-center justify-between">
                      <span className="font-mono-ui font-semibold text-[13px]">{m.materialNumber}</span>
                      <span className={`pill ${m.blendedScore > 0.55 ? "pill-warn" : "pill-neutral"}`}>
                        {Math.round(m.blendedScore * 100)}% match
                      </span>
                    </div>
                    <div className="text-[12px] mt-1" style={{ color: "var(--muted)" }}>{m.matchReason}</div>
                    <button
                      className="btn mt-2"
                      disabled={busy}
                      onClick={() => decide("Reuse", m.materialNumber)}
                    >
                      Reuse this material
                    </button>
                  </div>
                ))}
                {!request.duplicate_decision && (
                  <button className="btn btn-primary w-fit mt-1" disabled={busy} onClick={() => decide("ConfirmedNew")}>
                    None of these match — confirm as new material
                  </button>
                )}
              </div>
            )}

            {request.duplicate_decision && (
              <div className="mt-3 text-[12.5px] pill pill-neutral w-fit">
                Decision: {request.duplicate_decision === "Reuse" ? `Reuse ${request.reused_material_number}` : "Confirmed non-duplicate"}
              </div>
            )}
          </div>

          {/* steward approval */}
          {request.status === "Pending Approval" && (
            <div className="card p-5">
              <h3 className="text-[13.5px] font-semibold mb-3">Steward approval</h3>
              {permissions && !permissions.approveRequest ? (
                <div className="text-[12.5px] pill pill-neutral w-fit">
                  Waiting on a Steward or above to approve — your role ({""}
                  <span className="font-semibold">view only</span>) can&apos;t action this step.
                </div>
              ) : (
                <>
                  <textarea rows={2} placeholder="Comment (optional)" value={comment} onChange={(e) => setComment(e.target.value)} />
                  <div className="flex gap-2 mt-3">
                    <button className="btn" style={{ background: "var(--good)", color: "#fff", borderColor: "var(--good)" }} disabled={busy} onClick={() => approve("Approve")}>
                      <CheckCircle2 size={14} /> Approve
                    </button>
                    <button className="btn" disabled={busy} onClick={() => approve("Return")}>
                      <CornerUpLeft size={14} /> Return to requester
                    </button>
                    <button className="btn btn-danger" disabled={busy} onClick={() => approve("Reject")}>
                      <XCircle size={14} /> Reject
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          {request.status === "Approved" && (
            <div className="card p-5 flex items-center justify-between">
              <div>
                <h3 className="text-[13.5px] font-semibold">Approved — ready for SAP</h3>
                <p className="text-[12px]" style={{ color: "var(--muted)" }}>Pushes a validated payload through the mock BAPI_MATERIAL_SAVEDATA interface.</p>
              </div>
              {permissions && !permissions.createInSap ? (
                <span className="pill pill-neutral">Requires Steward role or above</span>
              ) : (
                <button className="btn btn-primary" disabled={busy} onClick={createInSap}>
                  <Rocket size={14} /> Create in SAP
                </button>
              )}
            </div>
          )}

          {request.status === "Created in SAP" && (
            <div className="card p-5 flex items-center gap-3" style={{ background: "var(--good-soft)" }}>
              <PackageCheck size={22} style={{ color: "var(--good)" }} />
              <div>
                <div className="font-semibold text-[13.5px]" style={{ color: "var(--good)" }}>
                  SAP material {request.sap_material_number} created
                </div>
                <div className="text-[12px]" style={{ color: "var(--muted)" }}>Now live in the material master.</div>
              </div>
            </div>
          )}
        </div>

        {/* audit trail */}
        <div className="card p-5 h-fit">
          <h3 className="text-[13.5px] font-semibold mb-3">Audit trail</h3>
          <div className="flex flex-col gap-3">
            {data.audit.map((a, i) => (
              <div key={i} className="text-[12px] border-l-2 pl-3" style={{ borderColor: "var(--accent)" }}>
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
