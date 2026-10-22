"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Factory, Loader2 } from "lucide-react";

const demoAccounts = [
  { email: "rahul.mehta@greenlam.com", name: "Rahul Mehta", role: "Requester", desc: "Raises new material requests" },
  { email: "anita.deshmukh@greenlam.com", name: "Anita Deshmukh", role: "Steward", desc: "Reviews duplicates & approves" },
  { email: "suresh.iyer@greenlam.com", name: "Suresh Iyer", role: "CategoryOwner", desc: "Owns taxonomy, bulk imports" },
  { email: "admin@greenlam.com", name: "System Admin", role: "Admin", desc: "Full access incl. bulk import" },
];

function LoginForm() {
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function login(em: string, pw: string) {
    setLoading(true);
    setError("");
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: em, password: pw }),
    });
    setLoading(false);
    if (!res.ok) {
      const d = await res.json();
      setError(d.error ?? "Login failed");
      return;
    }
    // Full navigation, not router.push: AppShell's user/session state is fetched once on
    // mount and won't re-run just because the client router navigated, so a soft push
    // here would land on "/" still believing no one is logged in.
    window.location.href = params.get("next") || "/";
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: "var(--bg)" }}>
      <div className="w-full max-w-[920px] grid md:grid-cols-2 gap-8 items-center">
        <div>
          <div className="flex items-center gap-2 mb-6">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: "var(--accent)" }}>
              <Factory size={18} color="#fff" />
            </div>
            <div>
              <div className="font-semibold text-[15px]">MDM Codify</div>
              <div className="text-[11px]" style={{ color: "var(--muted)" }}>Material Master Governance</div>
            </div>
          </div>

          <h1 className="text-[22px] font-bold mb-2">Sign in</h1>
          <p className="text-[13px] mb-6" style={{ color: "var(--muted)" }}>
            Role-based access — what you can do (submit requests, approve, bulk-import) depends on the account you sign in with.
          </p>

          <div className="card p-5 flex flex-col gap-3">
            <div>
              <label className="field-label">Email</label>
              <input type="text" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@greenlam.com" />
            </div>
            <div>
              <label className="field-label">Password</label>
              <input type="text" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="demo123" />
            </div>
            {error && <div className="text-[12.5px]" style={{ color: "var(--bad)" }}>{error}</div>}
            <button className="btn btn-primary mt-1" disabled={loading} onClick={() => login(email, password)}>
              {loading && <Loader2 size={14} className="animate-spin" />} Sign in
            </button>
          </div>
        </div>

        <div className="card p-5">
          <div className="text-[11.5px] font-semibold uppercase tracking-wide mb-3" style={{ color: "var(--muted)" }}>
            Quick demo sign-in
          </div>
          <div className="flex flex-col gap-2">
            {demoAccounts.map((acc) => (
              <button
                key={acc.email}
                onClick={() => login(acc.email, "demo123")}
                disabled={loading}
                className="flex items-center justify-between text-left p-3 rounded-lg border hover:border-[var(--accent)] transition-colors"
                style={{ borderColor: "var(--line)" }}
              >
                <div>
                  <div className="text-[13px] font-semibold">{acc.name}</div>
                  <div className="text-[11.5px]" style={{ color: "var(--muted)" }}>{acc.desc}</div>
                </div>
                <span className="pill pill-accent">{acc.role}</span>
              </button>
            ))}
          </div>
          <p className="text-[11px] mt-4" style={{ color: "var(--muted)" }}>
            Demo environment — all accounts use password <code>demo123</code>. Plaintext demo auth only; a production
            build would use hashed passwords behind SSO.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
