import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getDb();
  const user = await getCurrentUser();
  const body = await req.json();
  const decision = body.decision as "Reuse" | "ConfirmedNew";
  const materialNumber = body.materialNumber ?? null;
  const now = new Date().toISOString();

  const nextStatus = decision === "Reuse" ? "Closed - Reused Existing" : "Pending Approval";
  db.prepare(
    "UPDATE requests SET duplicate_decision=?, reused_material_number=?, status=?, updated_at=? WHERE id=?"
  ).run(decision, decision === "Reuse" ? materialNumber : null, nextStatus, now, id);

  db.prepare(`INSERT INTO audit_log (request_id, actor_id, actor_name, action, detail, created_at) VALUES (?,?,?,?,?,?)`).run(
    id,
    user?.id ?? "unknown",
    user?.name ?? "Unknown user",
    "Duplicate Decision",
    decision === "Reuse" ? `Reusing existing material ${materialNumber} — no new number created` : "Confirmed as non-duplicate, proceeding to approval",
    now
  );

  return NextResponse.json({ ok: true, status: nextStatus });
}
