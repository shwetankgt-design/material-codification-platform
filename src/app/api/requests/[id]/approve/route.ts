import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getCurrentUser, can } from "@/lib/auth";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getDb();
  const user = await getCurrentUser();
  if (!user || !can(user.role, "approveRequest")) {
    return NextResponse.json({ error: "Only stewards and above can approve requests" }, { status: 403 });
  }
  const body = await req.json();
  const action = body.action as "Approve" | "Reject" | "Return";
  const comment = body.comment ?? "";
  const now = new Date().toISOString();

  const statusMap: Record<string, string> = {
    Approve: "Approved",
    Reject: "Rejected",
    Return: "Returned",
  };
  const nextStatus = statusMap[action] ?? "Pending Approval";

  db.prepare("UPDATE requests SET status=?, updated_at=? WHERE id=?").run(nextStatus, now, id);
  db.prepare(`INSERT INTO audit_log (request_id, actor_id, actor_name, action, detail, created_at) VALUES (?,?,?,?,?,?)`).run(
    id, user.id, user.name, `Steward ${action}`, comment || "(no comment)", now
  );

  return NextResponse.json({ ok: true, status: nextStatus });
}
