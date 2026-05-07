import type { NextRequest } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/server/firebase-admin";
import { requireAuth, isAdminEmail } from "@/lib/server/auth";
import { ApiError, jsonError, jsonOk } from "@/lib/server/api-error";
import { redeemInviteCode } from "@/lib/server/invite-service";

export const runtime = "nodejs";

interface Body {
  name?: unknown;
  inviteCode?: unknown;
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    const raw = (await req.json().catch(() => ({}))) as Body;

    const name =
      typeof raw.name === "string" && raw.name.trim().length > 0
        ? raw.name.trim().slice(0, 50)
        : "회원";
    const inviteCode =
      typeof raw.inviteCode === "string" && raw.inviteCode.trim().length > 0
        ? raw.inviteCode.trim().toUpperCase()
        : null;

    const db = adminDb();
    const userRef = db.collection("users").doc(user.uid);
    const snap = await userRef.get();

    let inviteRedeemed = false;
    let inviteError: string | null = null;
    let totalPoints = (snap.exists ? snap.data()?.totalPoints || 0 : 0) as number;

    if (!snap.exists) {
      const role = isAdminEmail(user.email) ? "admin" : "consumer";
      await userRef.create({
        name,
        email: user.email,
        role,
        membershipLevel: 1,
        totalPoints: 0,
        createdAt: FieldValue.serverTimestamp(),
      });
      totalPoints = 0;
    }

    if (inviteCode) {
      try {
        const result = await redeemInviteCode(user.uid, inviteCode);
        inviteRedeemed = true;
        totalPoints += result.distributedToNewUser;
      } catch (err) {
        if (err instanceof ApiError) {
          inviteError = err.code;
        } else {
          inviteError = "INTERNAL";
        }
      }
    }

    return jsonOk({
      ok: true,
      totalPoints,
      inviteRedeemed,
      inviteError,
    });
  } catch (err) {
    return jsonError(err);
  }
}
