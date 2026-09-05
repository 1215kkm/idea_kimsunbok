import type { NextRequest } from "next/server";
import { requireAuth } from "@/lib/server/auth";
import { jsonError, jsonOk } from "@/lib/server/api-error";
import { createCampaign, listCampaignsForOwner, validateCreateInput } from "@/lib/server/reward-service";
import { REWARD_CHANNELS, REWARD_KINDS, REWARD_UNIT_AMOUNTS, MAX_HEADCOUNT } from "@/lib/reward-ledger";

export const runtime = "nodejs";

/** 내 캠페인 목록 + 선택지 메타 */
export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    const items = await listCampaignsForOwner(user.uid);
    return jsonOk({
      ok: true,
      items,
      options: {
        unitAmounts: REWARD_UNIT_AMOUNTS,
        channels: REWARD_CHANNELS,
        kinds: REWARD_KINDS,
        maxHeadcount: MAX_HEADCOUNT,
      },
    });
  } catch (err) {
    return jsonError(err);
  }
}

/** 캠페인 제출 = 예산(unitAmount × headcount) 즉시 잠금 → pending_review */
export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    const raw = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const input = validateCreateInput(raw);
    const result = await createCampaign(user.uid, input);
    return jsonOk({ ok: true, ...result, status: "pending_review" });
  } catch (err) {
    return jsonError(err);
  }
}
