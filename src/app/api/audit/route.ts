import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function GET() {
  const db = getDb();
  const rows = db.prepare("SELECT * FROM audit_log ORDER BY created_at DESC LIMIT 200").all();
  return NextResponse.json({ entries: rows });
}
