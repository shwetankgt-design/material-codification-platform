import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { extractAttributes, generateStandardDescription } from "@/lib/ai-engine";
import { getClass } from "@/lib/taxonomy-data";
import { getCurrentUser, can } from "@/lib/auth";
import type { RequestRow } from "@/lib/types";

function newId() {
  return "REQ-" + Math.random().toString(36).slice(2, 6).toUpperCase() + "-" + Date.now().toString(36).toUpperCase().slice(-5);
}

export async function GET(req: NextRequest) {
  const db = getDb();
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  let sql = "SELECT * FROM requests WHERE 1=1";
  const params: Record<string, string> = {};
  if (status) {
    sql += " AND status = @status";
    params.status = status;
  }
  sql += " ORDER BY created_at DESC";
  const rows = db.prepare(sql).all(params) as RequestRow[];
  return NextResponse.json({
    requests: rows.map((r) => ({ ...r, characteristics: JSON.parse(r.characteristics_json) })),
  });
}

export async function POST(req: NextRequest) {
  const db = getDb();
  const user = await getCurrentUser();
  if (!user || !can(user.role, "createRequest")) {
    return NextResponse.json({ error: "Not authorized to create requests" }, { status: 403 });
  }
  const body = await req.json();
  const freeText = (body?.freeText ?? "").toString().trim();
  const requesterId = user.id;
  const plant = user.plant ?? body?.plant ?? "1000 - Mundra";
  if (!freeText) return NextResponse.json({ error: "freeText is required" }, { status: 400 });

  const extraction = extractAttributes(freeText);
  const id = newId();
  const now = new Date().toISOString();
  const slaDue = new Date(Date.now() + 3 * 86400000).toISOString();

  let generatedDescription: string | null = null;
  if (extraction.classCode) {
    const cls = getClass(extraction.classCode);
    if (cls) generatedDescription = generateStandardDescription(cls, extraction.values);
  }

  db.prepare(
    `INSERT INTO requests
      (id, free_text, requester_id, taxonomy_id, class_code, characteristics_json, manufacturer, mfr_part_no,
       generated_description, status, ai_confidence, priority, plant, created_at, updated_at, sla_due_at)
     VALUES (@id,@freeText,@requesterId,@taxonomyId,@classCode,@characteristicsJson,@manufacturer,@mfrPartNo,
       @generatedDescription,@status,@aiConfidence,@priority,@plant,@createdAt,@updatedAt,@slaDueAt)`
  ).run({
    id,
    freeText,
    requesterId,
    taxonomyId: extraction.taxonomyId,
    classCode: extraction.classCode,
    characteristicsJson: JSON.stringify(extraction.values),
    manufacturer: extraction.values.make ?? null,
    mfrPartNo: null,
    generatedDescription,
    status: "Draft",
    aiConfidence: extraction.confidence,
    priority: "Normal",
    plant,
    createdAt: now,
    updatedAt: now,
    slaDueAt: slaDue,
  });

  db.prepare(
    `INSERT INTO audit_log (request_id, actor_id, actor_name, action, detail, created_at) VALUES (?,?,?,?,?,?)`
  ).run(id, user.id, user.name, "Created", `AI Copilot extracted attributes with ${extraction.confidence}% confidence`, now);

  return NextResponse.json({ id, extraction, generatedDescription });
}
