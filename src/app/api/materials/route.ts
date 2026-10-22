import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import type { Material } from "@/lib/types";

export async function GET(req: NextRequest) {
  const db = getDb();
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim();
  const classCode = searchParams.get("class");
  const status = searchParams.get("status");
  const plant = searchParams.get("plant");

  let sql = "SELECT * FROM materials WHERE 1=1";
  const params: Record<string, string> = {};
  if (q) {
    sql += " AND (description LIKE @q OR manufacturer LIKE @q OR material_number LIKE @q OR mfr_part_no LIKE @q)";
    params.q = `%${q}%`;
  }
  if (classCode) {
    sql += " AND class_code = @classCode";
    params.classCode = classCode;
  }
  if (status) {
    sql += " AND status = @status";
    params.status = status;
  }
  if (plant) {
    sql += " AND plant = @plant";
    params.plant = plant;
  }
  sql += " ORDER BY created_on DESC LIMIT 500";

  const rows = db.prepare(sql).all(params) as Material[];
  return NextResponse.json({
    total: rows.length,
    materials: rows.map((r) => ({ ...r, characteristics: JSON.parse(r.characteristics_json) })),
  });
}
