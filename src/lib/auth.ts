import { cookies } from "next/headers";
import crypto from "node:crypto";
import { getDb } from "./db";
import type { User } from "./types";

export const SESSION_COOKIE = "mdm_session";
const SESSION_TTL_MS = 12 * 60 * 60 * 1000; // 12h — fine for a demo session

// Role → permission matrix. Centralized here so every route and the UI check the
// same source of truth instead of re-deriving "who can do X" ad hoc.
export const ROLES = ["Requester", "Steward", "CategoryOwner", "Admin"] as const;
export type Role = (typeof ROLES)[number];

export const PERMISSIONS = {
  createRequest: ["Requester", "Steward", "CategoryOwner", "Admin"],
  decideDuplicate: ["Requester", "Steward", "CategoryOwner", "Admin"],
  approveRequest: ["Steward", "CategoryOwner", "Admin"],
  createInSap: ["Steward", "CategoryOwner", "Admin"],
  bulkImport: ["Admin", "CategoryOwner"],
  viewAudit: ["Steward", "CategoryOwner", "Admin"],
  manageTaxonomy: ["Admin"],
} as const satisfies Record<string, Role[]>;

export function can(role: string, action: keyof typeof PERMISSIONS): boolean {
  return (PERMISSIONS[action] as readonly string[]).includes(role);
}

export function createSession(userId: string): { token: string; expiresAt: string } {
  const db = getDb();
  const token = crypto.randomBytes(24).toString("hex");
  const now = new Date();
  const expires = new Date(now.getTime() + SESSION_TTL_MS);
  db.prepare("INSERT INTO sessions (token, user_id, created_at, expires_at) VALUES (?,?,?,?)").run(
    token,
    userId,
    now.toISOString(),
    expires.toISOString()
  );
  return { token, expiresAt: expires.toISOString() };
}

export function destroySession(token: string) {
  getDb().prepare("DELETE FROM sessions WHERE token = ?").run(token);
}

export function getUserByToken(token: string | undefined): User | null {
  if (!token) return null;
  const db = getDb();
  const session = db
    .prepare("SELECT * FROM sessions WHERE token = ? AND expires_at > ?")
    .get(token, new Date().toISOString()) as { user_id: string } | undefined;
  if (!session) return null;
  const user = db.prepare("SELECT id, name, role, email, plant FROM users WHERE id = ?").get(session.user_id) as
    | User
    | undefined;
  return user ?? null;
}

export async function getCurrentUser(): Promise<User | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  return getUserByToken(token);
}

export function verifyCredentials(email: string, password: string): User | null {
  const db = getDb();
  const row = db.prepare("SELECT * FROM users WHERE email = ? AND password = ?").get(email, password) as
    | (User & { password: string })
    | undefined;
  if (!row) return null;
  const { password: _pw, ...user } = row;
  return user;
}
