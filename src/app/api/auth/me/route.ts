import { NextResponse } from "next/server";
import { getCurrentUser, PERMISSIONS } from "@/lib/auth";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ user: null });
  const permissions = Object.fromEntries(
    Object.entries(PERMISSIONS).map(([action, roles]) => [action, (roles as readonly string[]).includes(user.role)])
  );
  return NextResponse.json({ user, permissions });
}
