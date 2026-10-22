import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { generateStandardDescription } from "@/lib/ai-engine";
import { getClass } from "@/lib/taxonomy-data";
import type { RequestRow } from "@/lib/types";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getDb();
  const row = db.prepare("SELECT * FROM requests WHERE id = ?").get(id) as RequestRow | undefined;
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const audit = db.prepare("SELECT * FROM audit_log WHERE request_id = ? ORDER BY created_at ASC").all(id);
  const matches = db.prepare("SELECT * FROM request_matches WHERE request_id = ? ORDER BY similarity_score DESC").all(id);
  return NextResponse.json({
    request: { ...row, characteristics: JSON.parse(row.characteristics_json) },
    audit,
    matches,
  });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getDb();
  const body = await req.json();
  const row = db.prepare("SELECT * FROM requests WHERE id = ?").get(id) as RequestRow | undefined;
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const characteristics = { ...JSON.parse(row.characteristics_json), ...(body.characteristics ?? {}) };
  const mfrPartNo = body.mfrPartNo ?? row.mfr_part_no;
  const manufacturer = characteristics.make ?? row.manufacturer;

  let generatedDescription = row.generated_description;
  if (row.class_code) {
    const cls = getClass(row.class_code);
    if (cls) generatedDescription = generateStandardDescription(cls, characteristics);
  }

  const now = new Date().toISOString();
  db.prepare(
    `UPDATE requests SET characteristics_json=?, mfr_part_no=?, manufacturer=?, generated_description=?, updated_at=? WHERE id=?`
  ).run(JSON.stringify(characteristics), mfrPartNo, manufacturer, generatedDescription, now, id);

  db.prepare(`INSERT INTO audit_log (request_id, actor_id, actor_name, action, detail, created_at) VALUES (?,?,?,?,?,?)`).run(
    id, body.actorId ?? "u-req-1", body.actorName ?? "Requester", "Updated", "Attributes / MPN updated", now
  );

  return NextResponse.json({ ok: true, generatedDescription });
}
