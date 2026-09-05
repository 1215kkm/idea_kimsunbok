import type { NextRequest } from "next/server";
import { adminDb } from "@/lib/server/firebase-admin";
import { ApiError, jsonError, jsonOk } from "@/lib/server/api-error";
import { getCampaignPublicInfo } from "@/lib/server/reward-service";

export const runtime = "nodejs";

/**
 * 가입 화면 배너용 코드 조회 (비인증).
 * 1) rewardCampaigns/{code} 가 있으면 그 정보 (지급 가능 여부 포함).
 * 2) 없고 구 inviteCodes/{code} 만 있으면 410 INACTIVE — 구 코드는 더 이상 지급되지 않는다 (기획서 §4.3).
 */
export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const code = (url.searchParams.get("code") || "").toUpperCase();
    if (!/^[A-Z0-9]{8}$/.test(code)) {
      throw new ApiError("INVALID_INPUT", "Invalid code format", 400, { field: "code" });
    }
    try {
      const info = await getCampaignPublicInfo(code);
      if (!info.redeemable) {
        throw new ApiError("INACTIVE", "캠페인이 지급 가능 상태가 아닙니다.", 410, { status: info.status });
      }
      return jsonOk({
        ok: true,
        code,
        amount: info.amount,
        label: `${info.amount.toLocaleString()}P`,
        source: "campaign",
      });
    } catch (err) {
      if (!(err instanceof ApiError) || err.code !== "NOT_FOUND") throw err;
    }
    const legacy = await adminDb().collection("inviteCodes").doc(code).get();
    if (legacy.exists) {
      throw new ApiError("INACTIVE", "구 초대 코드는 더 이상 사용할 수 없습니다.", 410, { source: "legacy" });
    }
    throw new ApiError("NOT_FOUND", "Invite code not found", 404);
  } catch (err) {
    return jsonError(err);
  }
}
