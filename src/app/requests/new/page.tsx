"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, Loader2, ArrowRight, CheckCircle2, AlertTriangle } from "lucide-react";

type Extraction = {
  classCode: string | null;
  taxonomyId: string | null;
  confidence: number;
  values: Record<string, string>;
  missingMandatory: string[];
  notes: string[];
};

const examples = [
  "Need SKF deep groove ball bearing, 25x52x15mm, sealed both sides, for conveyor gearbox",
  "Hex bolt M12 x 60, grade 8.8, zinc plated, for structural frame",
  "3-phase AC motor 7.5kW 4 pole 415V Siemens for exhaust fan",
  "Honeywell safety goggles, size free, for welding bay",
];

export default function NewRequestPage() {
  const router = useRouter();
  const [freeText, setFreeText] = useState("");
  const [extraction, setExtraction] = useState<Extraction | null>(null);
  const [loadingExtract, setLoadingExtract] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  async function runExtraction(text: string) {
    setFreeText(text);
    if (!text.trim()) {
      setExtraction(null);
      return;
    }
    setLoadingExtract(true);
    const res = await fetch("/api/extract", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ freeText: text }),
    });
    const data = await res.json();
    setExtraction(data);
    setLoadingExtract(false);
  }

  async function submit() {
    setSubmitting(true);
    setSubmitError(null);
    const res = await fetch("/api/requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ freeText }),
    });
    const data = await res.json();
    if (!res.ok || !data.id) {
      setSubmitError(data.error ?? "Could not create the request — please try again.");
      setSubmitting(false);
      return;
    }
    router.push(`/requests/${data.id}`);
  }

  const confidenceTone =
    extraction && extraction.confidence >= 80 ? "good" : extraction && extraction.confidence >= 55 ? "warn" : "bad";

  return (
    <div className="max-w-[880px] flex flex-col gap-5">
      <div className="card p-6">
        <div className="flex items-center gap-2 mb-1">
          <Sparkles size={16} style={{ color: "var(--accent)" }} />
          <h2 className="text-[14px] font-semibold">Smart Intake Copilot</h2>
        </div>
        <p className="text-[12.5px] mb-4" style={{ color: "var(--muted)" }}>
          Describe what you need in plain language. The copilot classifies it against the taxonomy, extracts
          characteristics, and checks the live material master for duplicates — before a material number is ever typed.
        </p>

        <textarea
          rows={3}
          placeholder="e.g. Need SKF deep groove ball bearing, 25x52x15mm, sealed both sides, for conveyor gearbox"
          value={freeText}
          onChange={(e) => runExtraction(e.target.value)}
        />

        <div className="flex flex-wrap gap-2 mt-3">
          {examples.map((ex) => (
            <button
              key={ex}
              onClick={() => runExtraction(ex)}
              className="text-[11.5px] px-2.5 py-1.5 rounded-full border"
              style={{ borderColor: "var(--line)", color: "var(--muted)" }}
            >
              {ex.slice(0, 44)}…
            </button>
          ))}
        </div>
      </div>

      {loadingExtract && (
        <div className="card p-6 flex items-center gap-2 text-[13px]" style={{ color: "var(--muted)" }}>
          <Loader2 size={15} className="animate-spin" /> Classifying and extracting attributes…
        </div>
      )}

      {extraction && !loadingExtract && (
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[13.5px] font-semibold">AI extraction result</h3>
            <span className={`pill pill-${confidenceTone}`}>{extraction.confidence}% confidence</span>
          </div>

          {extraction.classCode ? (
            <>
              <div className="flex flex-wrap gap-2 mb-4">
                <span className="pill pill-accent">Class: {extraction.classCode}</span>
                {extraction.missingMandatory.length === 0 ? (
                  <span className="pill pill-good flex items-center gap-1">
                    <CheckCircle2 size={12} /> All mandatory fields detected
                  </span>
                ) : (
                  <span className="pill pill-warn flex items-center gap-1">
                    <AlertTriangle size={12} /> {extraction.missingMandatory.length} field(s) need confirmation
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
                {Object.entries(extraction.values).map(([k, v]) => (
                  <div key={k} className="rounded-lg p-3" style={{ background: "var(--surface-2)" }}>
                    <div className="text-[10.5px] uppercase tracking-wide" style={{ color: "var(--muted)" }}>
                      {k}
                    </div>
                    <div className="text-[13px] font-semibold font-mono-ui">{v}</div>
                  </div>
                ))}
              </div>

              {extraction.missingMandatory.length > 0 && (
                <div className="text-[12.5px] rounded-lg p-3 mb-4" style={{ background: "var(--warn-soft)", color: "var(--warn)" }}>
                  Still need: {extraction.missingMandatory.join(", ")} — you'll confirm these on the next screen before
                  duplicate check runs.
                </div>
              )}

              <ul className="text-[12px] mb-5 flex flex-col gap-1" style={{ color: "var(--muted)" }}>
                {extraction.notes.map((n, i) => (
                  <li key={i}>· {n}</li>
                ))}
              </ul>

              <button className="btn btn-primary" disabled={submitting} onClick={submit}>
                {submitting ? <Loader2 size={14} className="animate-spin" /> : null}
                Create request & run duplicate check <ArrowRight size={14} />
              </button>
              {submitError && (
                <div className="text-[12.5px] mt-2" style={{ color: "var(--bad)" }}>
                  {submitError}
                </div>
              )}
            </>
          ) : (
            <div className="text-[13px]" style={{ color: "var(--bad)" }}>
              Could not classify this request against the current taxonomy. Try adding the item type (bearing, bolt,
              motor…) or route this to a steward for manual classification.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
