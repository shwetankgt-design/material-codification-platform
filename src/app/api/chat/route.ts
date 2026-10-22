import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

// Steward Copilot — grounded Q&A over the live request/material tables.
// Honest framing: this parses intent with patterns and answers from real SQL queries
// against the current database (not a scripted transcript), which is what makes the
// "explainability" demo legitimate — swap the intent parser for an LLM call later and
// the grounding (the SQL + data it reads) stays identical.

type Intent =
  | "pending_count"
  | "oldest_pending"
  | "duplicate_rate"
  | "overdue_sla"
  | "spend_by_category"
  | "explain_duplicate"
  | "dq_summary"
  | "help";

function detectIntent(msg: string): Intent {
  const m = msg.toLowerCase();
  if (/(why|explain).*(duplicate|flag|match)/.test(m)) return "explain_duplicate";
  if (/(overdue|late|sla|breach)/.test(m)) return "overdue_sla";
  if (/(oldest|longest|waiting)/.test(m)) return "oldest_pending";
  if (/(duplicate rate|how many duplicate|duplicates (caught|found|avoided))/.test(m)) return "duplicate_rate";
  if (/(spend|cost|budget)/.test(m)) return "spend_by_category";
  if (/(data quality|dq score|quality score)/.test(m)) return "dq_summary";
  if (/(pending|queue|how many request|awaiting)/.test(m)) return "pending_count";
  return "help";
}

export async function POST(req: NextRequest) {
  const db = getDb();
  const body = await req.json();
  const message = (body?.message ?? "").toString();
  const sessionId = body?.sessionId ?? "default";
  const intent = detectIntent(message);

  let reply = "";

  if (intent === "pending_count") {
    const row = db
      .prepare("SELECT COUNT(*) c FROM requests WHERE status IN ('Pending Approval','Duplicate Review')")
      .get() as { c: number };
    reply = `There are **${row.c}** requests currently awaiting steward action (Duplicate Review + Pending Approval).`;
  } else if (intent === "oldest_pending") {
    const rows = db
      .prepare(
        "SELECT id, free_text, created_at FROM requests WHERE status NOT IN ('Approved','Rejected','Created in SAP','Closed - Reused Existing') ORDER BY created_at ASC LIMIT 3"
      )
      .all() as { id: string; free_text: string; created_at: string }[];
    if (rows.length === 0) reply = "No open requests right now — queue is clear.";
    else
      reply =
        "Oldest open requests:\n" +
        rows.map((r) => `- **${r.id}** — "${r.free_text}" (opened ${new Date(r.created_at).toLocaleDateString()})`).join("\n");
  } else if (intent === "duplicate_rate") {
    const total = (db.prepare("SELECT COUNT(*) c FROM requests").get() as { c: number }).c;
    const dup = (db.prepare("SELECT COUNT(*) c FROM requests WHERE duplicate_decision='Reuse'").get() as { c: number }).c;
    const pct = total ? Math.round((dup / total) * 100) : 0;
    reply = `**${dup}** of **${total}** requests (${pct}%) were resolved by reusing an existing SAP material instead of creating a new one — that's duplicate creation avoided directly by the AI duplicate check.`;
  } else if (intent === "overdue_sla") {
    const rows = db
      .prepare(
        "SELECT id, free_text, sla_due_at FROM requests WHERE sla_due_at < ? AND status NOT IN ('Approved','Rejected','Created in SAP','Closed - Reused Existing') ORDER BY sla_due_at ASC"
      )
      .all(new Date().toISOString()) as { id: string; free_text: string; sla_due_at: string }[];
    if (rows.length === 0) reply = "Nothing is past its SLA due date right now.";
    else
      reply =
        `**${rows.length}** request(s) are past their 3-day SLA:\n` +
        rows.slice(0, 5).map((r) => `- **${r.id}** — "${r.free_text}" (due ${new Date(r.sla_due_at).toLocaleDateString()})`).join("\n");
  } else if (intent === "spend_by_category") {
    const rows = db
      .prepare("SELECT material_group, SUM(annual_spend) s FROM materials GROUP BY material_group ORDER BY s DESC LIMIT 6")
      .all() as { material_group: string; s: number }[];
    reply =
      "Annual spend by material group:\n" +
      rows.map((r) => `- ${r.material_group}: ₹${(r.s / 100000).toFixed(1)}L`).join("\n");
  } else if (intent === "dq_summary") {
    const row = db.prepare("SELECT AVG(dq_score) a, SUM(CASE WHEN dq_score<65 THEN 1 ELSE 0 END) poor FROM materials").get() as {
      a: number;
      poor: number;
    };
    reply = `Average data quality score across the material master is **${Math.round(row.a)}/100**. **${row.poor}** records are below 65 (missing manufacturer part number or key attributes) and are candidates for a cleanup campaign.`;
  } else if (intent === "explain_duplicate") {
    const lastMatch = db
      .prepare(
        `SELECT rm.*, r.free_text, r.generated_description FROM request_matches rm
         JOIN requests r ON r.id = rm.request_id ORDER BY rm.id DESC LIMIT 1`
      )
      .get() as any;
    if (!lastMatch) reply = "No duplicate match has been computed yet — run a duplicate check on a request first.";
    else
      reply = `The most recent match: **${lastMatch.material_number}** scored **${Math.round(
        lastMatch.similarity_score * 100
      )}%** similar to "${lastMatch.generated_description ?? lastMatch.free_text}". Reason: ${lastMatch.match_reason}. This blends text similarity, word-order-independent token overlap, a TF-IDF relevance score, and attribute-level overlap — not a single exact-match rule.`;
  } else {
    reply =
      "I can answer questions grounded in the live queue and material master, for example:\n" +
      "- \"How many requests are pending?\"\n- \"What's the oldest open request?\"\n- \"What's our duplicate rate?\"\n- \"Anything overdue on SLA?\"\n- \"Spend by category?\"\n- \"What's our data quality score?\"\n- \"Why was the last match flagged as a duplicate?\"";
  }

  const now = new Date().toISOString();
  db.prepare("INSERT INTO chat_messages (session_id, role, content, created_at) VALUES (?,?,?,?)").run(sessionId, "user", message, now);
  db.prepare("INSERT INTO chat_messages (session_id, role, content, created_at) VALUES (?,?,?,?)").run(sessionId, "assistant", reply, now);

  return NextResponse.json({ reply, intent });
}

export async function GET(req: NextRequest) {
  const db = getDb();
  const sessionId = new URL(req.url).searchParams.get("sessionId") ?? "default";
  const rows = db.prepare("SELECT * FROM chat_messages WHERE session_id = ? ORDER BY id ASC").all(sessionId);
  return NextResponse.json({ messages: rows });
}
