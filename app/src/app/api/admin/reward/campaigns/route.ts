import type { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import { jsonError, jsonOk } from "@/lib/server/api-error";
import { listCampaignsForAdmin } from "@/lib/server/reward-service";

export const runtime = "nodejs";

/** 전체 캠페인 (status 필터: pending_review | live | paused | ended | rejected | all) */
export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req);
    const status = new URL(req.url).searchParams.get("status") || "pending_review";
    const items = await listCampaignsForAdmin(status);
    return jsonOk({ ok: true, status, items });
  } catch (err) {
    return jsonError(err);
  }
}
