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
  let auth;
  try {
    auth = adminAuth();
  } catch (err) {
    // Service Account 미설정/오류 — 클라이언트에는 500 + 명확한 메시지
    console.error("[auth] adminAuth init failed:", err);
    throw new ApiError(
      "INTERNAL",
      "Server is missing FIREBASE_SERVICE_ACCOUNT_KEY env var. Configure it in Vercel and redeploy.",
      500,
    );
  }
  try {
    const decoded = await auth.verifyIdToken(idToken);
    return {
      uid: decoded.uid,
      email: decoded.email ?? null,
      emailVerified: decoded.email_verified ?? false,
    };
  } catch (err) {
    console.error("[auth] verifyIdToken failed:", err);
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
