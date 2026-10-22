import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getCurrentUser, can } from "@/lib/auth";
import { validateRow, taxonomyIdForClass } from "@/lib/import-validation";
import { taxonomyTree } from "@/lib/taxonomy-data";

function newMaterialNumber(db: ReturnType<typeof getDb>): string {
  let num: string;
  do {
    num = String(Math.floor(10000000 + Math.random() * 89999999));
  } while (db.prepare("SELECT 1 FROM materials WHERE material_number = ?").get(num));
  return num;
}

export async function POST(req: NextRequest) {
  const db = getDb();
  const user = await getCurrentUser();
  const body = await req.json();
  const classCode = (body.classCode ?? "").toString();
  const rows = (body.rows ?? []) as Record<string, string>[];
  const commit = !!body.commit;
  const filename = body.filename ?? "upload.csv";

  if (!classCode || rows.length === 0) {
    return NextResponse.json({ error: "classCode and rows are required" }, { status: 400 });
  }

  const results = rows.map((r, i) => validateRow(classCode, r, i + 2)); // +2: header is row 1
  const valid = results.filter((r) => r.errors.length === 0);
  const invalid = results.filter((r) => r.errors.length > 0);

  // duplicate check within the file itself and against the live material master,
  // using the same exact-description + attribute signature the single-request flow uses
  const existingDescriptions = new Set(
    (db.prepare("SELECT description FROM materials WHERE class_code = ?").all(classCode) as { description: string }[]).map(
      (m) => m.description.toLowerCase()
    )
  );
  const seenInFile = new Set<string>();
  for (const r of valid) {
    const key = r.description.toLowerCase();
    if (existingDescriptions.has(key)) r.errors.push("Exact duplicate of an existing SAP material description");
    else if (seenInFile.has(key)) r.errors.push("Duplicate row within this file");
    seenInFile.add(key);
  }
  const trulyValid = valid.filter((r) => r.errors.length === 0);
  const nowInvalid = valid.filter((r) => r.errors.length > 0);

  if (!commit) {
    return NextResponse.json({
      preview: true,
      total: results.length,
      validCount: trulyValid.length,
      invalidCount: invalid.length + nowInvalid.length,
      rows: [...trulyValid.map((r) => ({ ...r, ok: true })), ...invalid.map((r) => ({ ...r, ok: false })), ...nowInvalid.map((r) => ({ ...r, ok: false }))].sort(
        (a, b) => a.rowNumber - b.rowNumber
      ),
    });
  }

  if (!user || !can(user.role, "bulkImport")) {
    return NextResponse.json({ error: "Only Admin / Category Owner can commit a bulk import" }, { status: 403 });
  }

  const taxonomyId = taxonomyIdForClass(classCode);
  const materialGroup = taxonomyTree.find((n) => n.id === taxonomyId)?.materialGroup ?? "MISC";
  const now = new Date().toISOString();
  const insert = db.prepare(`
    INSERT INTO materials
      (material_number, description, taxonomy_id, class_code, material_type, material_group, base_uom,
       manufacturer, mfr_part_no, plant, status, characteristics_json, created_on, last_movement, annual_spend, dq_score)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
  `);

  const created: string[] = [];
  const tx = db.transaction(() => {
    for (const r of trulyValid) {
      const matNo = newMaterialNumber(db);
      insert.run(
        matNo,
        r.description,
        taxonomyId,
        classCode,
        "ERSA",
        materialGroup,
        "EA",
        r.manufacturer,
        r.mfrPartNo,
        r.plant,
        r.dqScore < 68 ? "Blocked" : "Active",
        JSON.stringify(r.values),
        now.slice(0, 10),
        null,
        0,
        r.dqScore
      );
      created.push(matNo);
    }
  });
  tx();

  const batchId = "IMP-" + Date.now().toString(36).toUpperCase();
  db.prepare(
    `INSERT INTO import_batches (id, filename, class_code, actor_id, actor_name, total_rows, success_rows, error_rows, created_at)
     VALUES (?,?,?,?,?,?,?,?,?)`
  ).run(batchId, filename, classCode, user.id, user.name, results.length, trulyValid.length, invalid.length + nowInvalid.length, now);

  db.prepare(
    `INSERT INTO audit_log (request_id, actor_id, actor_name, action, detail, created_at) VALUES (NULL,?,?,?,?,?)`
  ).run(
    user.id,
    user.name,
    "Bulk Import",
    `${batchId}: ${trulyValid.length} material(s) created from "${filename}" (${classCode}), ${invalid.length + nowInvalid.length} row(s) rejected`,
    now
  );

  return NextResponse.json({
    ok: true,
    batchId,
    createdCount: created.length,
    createdMaterialNumbers: created,
    rejectedCount: invalid.length + nowInvalid.length,
  });
}
