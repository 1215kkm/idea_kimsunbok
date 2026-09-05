import type { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import { ApiError, jsonError, jsonOk } from "@/lib/server/api-error";
import { applyAdminAction, setCampaignDailyCap } from "@/lib/server/reward-service";
import { isAdminAction } from "@/lib/reward-ledger";

export const runtime = "nodejs";

/**
 * POST /api/admin/reward/campaigns/{id}/{approve|reject|pause|resume|end|daily-cap}
 *  - reject · end: body.reason 필수
 *  - daily-cap: body.dailyCap (정수 1..10000)
 * 전부 adminAuditLogs 에 before/after 기록 (withAdminAudit).
 */
export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string; action: string }> },
) {
  try {
    const admin = await requireAdmin(req);
    const { id, action } = await ctx.params;
    const body = (await req.json().catch(() => ({}))) as { reason?: unknown; dailyCap?: unknown };
    const campaignId = id.toUpperCase();

    if (action === "daily-cap") {
      const result = await setCampaignDailyCap(campaignId, admin.uid, body.dailyCap);
      return jsonOk({ ok: true, ...result });
    }
    if (!isAdminAction(action)) {
      throw new ApiError("INVALID_INPUT", "action must be approve|reject|pause|resume|end|daily-cap", 400, {
        field: "action",
      });
    }
    const reason = typeof body.reason === "string" ? body.reason : undefined;
    const result = await applyAdminAction(campaignId, action, admin.uid, reason);
    return jsonOk({ ok: true, ...result });
  } catch (err) {
    return jsonError(err);
  }
}
