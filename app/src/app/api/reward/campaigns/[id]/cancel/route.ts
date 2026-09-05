import type { NextRequest } from "next/server";
import { requireAuth } from "@/lib/server/auth";
import { jsonError, jsonOk } from "@/lib/server/api-error";
import { cancelCampaign } from "@/lib/server/reward-service";

export const runtime = "nodejs";

/** POST /api/reward/campaigns/{id}/cancel — 광고주 본인, 승인 전만, 전액 반환 */
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAuth(req);
    const { id } = await ctx.params;
    const result = await cancelCampaign(user.uid, id.toUpperCase());
    return jsonOk({ ok: true, ...result });
  } catch (err) {
    return jsonError(err);
  }
}
