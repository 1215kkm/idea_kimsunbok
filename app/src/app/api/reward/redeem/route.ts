import type { NextRequest } from "next/server";
import { requireAuth } from "@/lib/server/auth";
import { ApiError, jsonError, jsonOk } from "@/lib/server/api-error";
import { redeemCampaignCode } from "@/lib/server/reward-service";

export const runtime = "nodejs";

/**
 * 캠페인 코드 리딤 — 광고주 에스크로 → 내 잔액 (제로섬, 1인 1회).
 * 게이트: 이메일 인증(email_verified) 필수, uid·구 초대·이메일 해시 셋 중 하나라도 있으면 거부, 캠페인 일일 상한.
 */
export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    const body = (await req.json().catch(() => ({}))) as { code?: unknown };
    if (typeof body.code !== "string") {
      throw new ApiError("INVALID_INPUT", "code is required", 400, { field: "code" });
    }
    const result = await redeemCampaignCode(
      { uid: user.uid, email: user.email, emailVerified: user.emailVerified },
      body.code,
    );
    return jsonOk({ ok: true, ...result });
  } catch (err) {
    return jsonError(err);
  }
}
