import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function GET() {
  const db = getDb();

  const totalMaterials = (db.prepare("SELECT COUNT(*) c FROM materials").get() as { c: number }).c;
  const avgDq = (db.prepare("SELECT AVG(dq_score) a FROM materials").get() as { a: number }).a;
  const blocked = (db.prepare("SELECT COUNT(*) c FROM materials WHERE status='Blocked'").get() as { c: number }).c;

  const byClass = db
    .prepare("SELECT class_code, COUNT(*) c, AVG(dq_score) dq, SUM(annual_spend) spend FROM materials GROUP BY class_code ORDER BY c DESC")
    .all();

  const byStatus = db.prepare("SELECT status, COUNT(*) c FROM requests GROUP BY status").all();

  const requestsTotal = (db.prepare("SELECT COUNT(*) c FROM requests").get() as { c: number }).c;
  const duplicatesCaught = (db
    .prepare("SELECT COUNT(*) c FROM requests WHERE duplicate_decision='Reuse'")
    .get() as { c: number }).c;

  const totalSpend = (db.prepare("SELECT SUM(annual_spend) s FROM materials").get() as { s: number }).s;
  const dqBuckets = db
    .prepare(
      `SELECT
        SUM(CASE WHEN dq_score >= 85 THEN 1 ELSE 0 END) good,
        SUM(CASE WHEN dq_score >= 65 AND dq_score < 85 THEN 1 ELSE 0 END) fair,
        SUM(CASE WHEN dq_score < 65 THEN 1 ELSE 0 END) poor
      FROM materials`
    )
    .get();

  const recentActivity = db
    .prepare("SELECT * FROM audit_log ORDER BY created_at DESC LIMIT 12")
    .all();

  return NextResponse.json({
    totalMaterials,
    avgDq: Math.round(avgDq ?? 0),
    blocked,
    byClass,
    byStatus,
    requestsTotal,
    duplicatesCaught,
    totalSpend: Math.round(totalSpend ?? 0),
    dqBuckets,
    recentActivity,
  });
}
