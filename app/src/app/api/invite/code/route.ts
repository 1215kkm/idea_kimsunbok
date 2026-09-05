import { NextResponse, type NextRequest } from "next/server";
import { requireAuth } from "@/lib/server/auth";
import { jsonError, jsonOk } from "@/lib/server/api-error";
import { getActiveInviteForUser } from "@/lib/server/invite-service";
import { listTiers } from "@/lib/server/invite-tiers";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    const active = await getActiveInviteForUser(user.uid);
    return jsonOk({
      ok: true,
      tiers: listTiers(),
      active: active
        ? {
            code: active.code,
            tierId: active.tierId,
            amount: active.amount,
            redeemCount: active.redeemCount,
            totalAdvertiserNetGain: active.totalAdvertiserNetGain,
          }
        : null,
    });
  } catch (err) {
    return jsonError(err);
  }
}

/**
 * 410 Gone — 구 초대 코드 발급 (2026-09-06 CEO 결정, 기획서 §4.3).
 * 예산 잠금 없는 코드는 더 이상 만들지 않는다. 대체: POST /api/reward/campaigns
 * GET 은 구 코드 조회(읽기 전용)를 위해 유지.
 */
/**
 * 410 Gone — 구 초대 코드 발급 (2026-09-06 CEO 결정, 기획서 §4.3).
 * 예산 잠금 없는 코드는 더 이상 만들지 않는다. 대체: POST /api/reward/campaigns
 * GET 은 구 코드 조회(읽기 전용)를 위해 유지.
 */
export async function POST() {
  return NextResponse.json(
    {
      error: "INVITE_DEPRECATED",
      message: "구 초대 코드 발급은 중단되었습니다. 리워드 캠페인(/api/reward/campaigns)을 제출해 주세요.",
      replacement: "/api/reward/campaigns",
    },
    { status: 410, headers: { "Cache-Control": "no-store" } },
  );
}
