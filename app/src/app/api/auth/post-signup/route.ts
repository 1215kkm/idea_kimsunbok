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
  betaConsent?: unknown;
}

// 베타 테스터에게 지급하는 가상 테스트 자금 (실 화폐 X, 시뮬레이션 전용)
const BETA_INITIAL_FUNDS = 1_000_000;

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
      const betaConsent = raw.betaConsent === true;
      await userRef.create({
        name,
        email: user.email,
        role,
        membershipLevel: 1,
        totalPoints: BETA_INITIAL_FUNDS,
        isBetaTester: true,
        betaTestFunds: BETA_INITIAL_FUNDS,
        betaConsentAt: betaConsent ? FieldValue.serverTimestamp() : null,
        createdAt: FieldValue.serverTimestamp(),
      });
      totalPoints = BETA_INITIAL_FUNDS;
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
