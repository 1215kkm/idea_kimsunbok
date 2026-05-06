import type { NextRequest } from "next/server";
import { adminAuth, adminDb } from "./firebase-admin";
import { ApiError } from "./api-error";

export interface AuthedUser {
  uid: string;
  email: string | null;
  emailVerified: boolean;
}

export async function requireAuth(req: NextRequest): Promise<AuthedUser> {
  const header = req.headers.get("authorization") || "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  if (!match) {
    throw new ApiError("UNAUTHENTICATED", "Missing or malformed Authorization header", 401);
  }
  const idToken = match[1];
  try {
    const decoded = await adminAuth().verifyIdToken(idToken);
    return {
      uid: decoded.uid,
      email: decoded.email ?? null,
      emailVerified: decoded.email_verified ?? false,
    };
  } catch {
    throw new ApiError("UNAUTHENTICATED", "Invalid or expired token", 401);
  }
}

export async function requireAdmin(req: NextRequest): Promise<AuthedUser> {
  const user = await requireAuth(req);
  const snap = await adminDb().collection("users").doc(user.uid).get();
  const role = snap.exists ? (snap.data()?.role as string | undefined) : undefined;
  if (role !== "admin") {
    throw new ApiError("FORBIDDEN", "Admin role required", 403);
  }
  return user;
}

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const list = (process.env.ADMIN_EMAIL_ALLOWLIST || "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return list.includes(email.toLowerCase());
}
