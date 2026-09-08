import type { NextRequest } from "next/server";
import { requireAuth } from "@/lib/server/auth";
import { ApiError, jsonError, jsonOk } from "@/lib/server/api-error";
import { clearPendingRewardCode, redeemCampaignCode } from "@/lib/server/reward-service";

export const runtime = "nodejs";

/**
 * 가입 시 보관된 코드(users.pendingRewardCode)가 더 이상 청구될 수 없는 결과.
 * 이때도 코드를 지워야 대시보드 "지급 대기" 배너가 영원히 남지 않는다.
 * CAMPAIGN_NOT_ACTIVE(일시정지 → 재개 가능)·DAILY_CAP_REACHED(내일 재시도)·EMAIL_NOT_VERIFIED 는 남긴다.
 */
const TERMINAL_CODES = new Set(["ALREADY_REDEEMED", "NOT_FOUND", "SELF_INVITE", "BUDGET_EXHAUSTED"]);

/**
 * 캠페인 코드 리딤 — 광고주 에스크로 → 내 잔액 (제로섬, 1인 1회).
 * 게이트: 이메일 인증(email_verified) 필수, uid·구 초대·이메일 해시 셋 중 하나라도 있으면 거부, 캠페인 일일 상한.
 * 성공(또는 영구 실패) 시 users.pendingRewardCode 를 원장 트랜잭션 밖에서 정리한다.
 */
export async function POST(req: NextRequest) {
  let uid: string | null = null;
  try {
    const user = await requireAuth(req);
    uid = user.uid;
    const body = (await req.json().catch(() => ({}))) as { code?: unknown };
    if (typeof body.code !== "string") {
      throw new ApiError("INVALID_INPUT", "code is required", 400, { field: "code" });
    }
    const result = await redeemCampaignCode(
      { uid: user.uid, email: user.email, emailVerified: user.emailVerified },
      body.code,
    );
    await clearPendingRewardCode(user.uid);
    return jsonOk({ ok: true, ...result });
  } catch (err) {
    if (uid && err instanceof ApiError && TERMINAL_CODES.has(err.code)) {
      try {
        await clearPendingRewardCode(uid);
      } catch (cleanupErr) {
        console.error("[reward/redeem] pendingRewardCode cleanup failed", { uid, cleanupErr });
      }
    }
    return jsonError(err);
  }
}
