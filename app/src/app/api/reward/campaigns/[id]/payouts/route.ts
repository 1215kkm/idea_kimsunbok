import type { NextRequest } from "next/server";
import { requireAuth } from "@/lib/server/auth";
import { jsonError, jsonOk } from "@/lib/server/api-error";
import { listPayoutsForOwner } from "@/lib/server/reward-service";

export const runtime = "nodejs";

/** GET /api/reward/campaigns/{id}/payouts — 본인 소유 캠페인의 지급내역 (받은 회원은 마스킹) */
export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAuth(req);
    const { id } = await ctx.params;
    const items = await listPayoutsForOwner(user.uid, id.toUpperCase());
    return jsonOk({ ok: true, items });
  } catch (err) {
    return jsonError(err);
  }
}
