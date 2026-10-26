import type { NextRequest } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/server/firebase-admin";
import { requireAuth, isAdminEmail } from "@/lib/server/auth";
import { ApiError, jsonError, jsonOk } from "@/lib/server/api-error";
import { redeemCampaignCode } from "@/lib/server/reward-service";
import { parseBusinessInfo, type BusinessInfo } from "@/lib/business";

export const runtime = "nodejs";

interface Body {
  name?: unknown;
  inviteCode?: unknown;
  betaConsent?: unknown;
  memberType?: unknown;
  business?: unknown;
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

    // 기업회원: 상호·사업자등록번호(검증식)·대표자. 번호의 실제 등록 여부는 관리자 확인 전까지 미확인으로 둔다.
    let business: BusinessInfo | null = null;
    if (raw.memberType === "business") {
      const parsed = parseBusinessInfo(raw.business);
      if (!parsed.ok) throw new ApiError("INVALID_INPUT", parsed.message, 400, { field: parsed.field });
      business = parsed.value;
    }

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
        memberType: business ? "business" : "personal",
        ...(business ? { business, businessVerified: false } : {}),
        membershipLevel: 1,
        totalPoints: BETA_INITIAL_FUNDS,
        isBetaTester: true,
        betaTestFunds: BETA_INITIAL_FUNDS,
        betaConsentAt: betaConsent ? FieldValue.serverTimestamp() : null,
        createdAt: FieldValue.serverTimestamp(),
      });
      totalPoints = BETA_INITIAL_FUNDS;
    }

    // 가입 리워드 = 광고주 캠페인 에스크로에서 제로섬 이전 (reward-service). 구 redeemInviteCode 는 410.
    if (inviteCode) {
      try {
        // 이메일 미인증이면 EMAIL_NOT_VERIFIED 로 돌아온다 — 인증 후 POST /api/reward/redeem 으로 다시 청구
        const result = await redeemCampaignCode(
          { uid: user.uid, email: user.email, emailVerified: user.emailVerified },
          inviteCode,
        );
        inviteRedeemed = true;
        totalPoints = result.newBalance;
      } catch (err) {
        if (err instanceof ApiError) {
          inviteError = err.code;
          // 인증만 안 된 상태 — 코드를 보관해 인증 후 재청구(POST /api/reward/redeem)에 쓴다
          if (err.code === "EMAIL_NOT_VERIFIED") {
            await userRef.set({ pendingRewardCode: inviteCode }, { merge: true });
          }
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
