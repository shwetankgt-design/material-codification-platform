export default function StatCard({
  label,
  value,
  sub,
  tone = "neutral",
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: "good" | "warn" | "bad" | "neutral" | "accent";
}) {
  const toneColor =
    tone === "good" ? "var(--good)" : tone === "warn" ? "var(--warn)" : tone === "bad" ? "var(--bad)" : tone === "accent" ? "var(--accent)" : "var(--ink)";
  return (
    <div className="card p-5">
      <div className="text-[11.5px] font-semibold uppercase tracking-wide" style={{ color: "var(--muted)" }}>
        {label}
      </div>
      <div className="text-[28px] font-bold mt-1.5 font-mono-ui" style={{ color: toneColor }}>
        {value}
      </div>
      {sub && (
        <div className="text-[12px] mt-1" style={{ color: "var(--muted)" }}>
          {sub}
        </div>
      )}
    </div>
  );
}
