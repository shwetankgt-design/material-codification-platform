import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getCurrentUser, can } from "@/lib/auth";
import type { RequestRow } from "@/lib/types";

// Mocked SAP write-back. In production Phase 2 this swaps for a real BAPI_MATERIAL_SAVEDATA /
// OData call through middleware — the request/response shape here is deliberately modeled on
// that payload so the swap is additive, not a rewrite.
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getDb();
  const user = await getCurrentUser();
  if (!user || !can(user.role, "createInSap")) {
    return NextResponse.json({ error: "Only stewards and above can push to SAP" }, { status: 403 });
  }
  const row = db.prepare("SELECT * FROM requests WHERE id = ?").get(id) as RequestRow | undefined;
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (row.status !== "Approved") return NextResponse.json({ error: "Request is not approved" }, { status: 400 });

  const matNumber = "1" + Math.floor(100000 + Math.random() * 899999).toString();
  const now = new Date().toISOString();

  db.prepare("UPDATE requests SET status=?, sap_material_number=?, updated_at=? WHERE id=?").run(
    "Created in SAP", matNumber, now, id
  );

  const characteristics = JSON.parse(row.characteristics_json);
  db.prepare(
    `INSERT INTO materials
      (material_number, description, taxonomy_id, class_code, material_type, material_group, base_uom,
       manufacturer, mfr_part_no, plant, status, characteristics_json, created_on, last_movement, annual_spend, dq_score)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
  ).run(
    matNumber, row.generated_description, row.taxonomy_id, row.class_code, "ERSA",
    row.taxonomy_id, "EA", row.manufacturer, row.mfr_part_no, row.plant, "Active",
    row.characteristics_json, now.slice(0, 10), null, 0, 100
  );

  db.prepare(`INSERT INTO audit_log (request_id, actor_id, actor_name, action, detail, created_at) VALUES (?,?,?,?,?,?)`).run(
    id, "system", "SAP Interface (mock BAPI_MATERIAL_SAVEDATA)", "SAP Material Created", `Material number ${matNumber} created`, now
  );

  return NextResponse.json({ ok: true, materialNumber: matNumber });
}
