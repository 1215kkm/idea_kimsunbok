import type { NextRequest } from "next/server";
import { adminDb } from "@/lib/server/firebase-admin";
import { requireAdmin } from "@/lib/server/auth";
import { ApiError, jsonError, jsonOk } from "@/lib/server/api-error";
import type { PayoutItem } from "@/lib/admin-types";

export const runtime = "nodejs";

const CODE_RE = /^[A-Z0-9]{8}$/;

/**
 * GET /api/admin/reward/campaigns/{id}/payouts — 캠페인 지급내역 (rewardPayouts where campaignId)
 * orderBy 를 붙이면 복합 인덱스가 필요하므로 메모리에서 paidAt 내림차순 정렬 (최대 500건).
 */
export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin(req);
    const { id } = await ctx.params;
    const campaignId = (id || "").toUpperCase();
    if (!CODE_RE.test(campaignId)) {
      throw new ApiError("INVALID_INPUT", "Invalid campaignId", 400, { field: "campaignId" });
    }
    const db = adminDb();
    const snap = await db.collection("rewardPayouts").where("campaignId", "==", campaignId).limit(500).get();

    const uids = snap.docs.map((d) => (d.data().inviteeUid as string) || d.id);
    const emailMap = new Map<string, string>();
    if (uids.length > 0) {
      const users = await db.getAll(...uids.map((u) => db.collection("users").doc(u)));
      users.forEach((u) => {
        if (u.exists) emailMap.set(u.id, u.data()?.email || "");
      });
    }

    const items: PayoutItem[] = snap.docs
      .map((d) => {
        const p = d.data();
        const inviteeUid = (p.inviteeUid as string) || d.id;
        const paidAt = p.paidAt as { toMillis?: () => number } | undefined;
        return {
          id: d.id,
          inviteeUid,
          inviteeEmail: emailMap.get(inviteeUid) || "",
          amount: typeof p.amount === "number" ? p.amount : 0,
          condition: typeof p.condition === "string" ? p.condition : "",
          status: typeof p.status === "string" ? p.status : "paid",
          paidAt: paidAt && typeof paidAt.toMillis === "function" ? paidAt.toMillis() : null,
        };
      })
      .sort((a, b) => (b.paidAt ?? 0) - (a.paidAt ?? 0));

    return jsonOk({ ok: true, campaignId, items });
  } catch (err) {
    return jsonError(err);
  }
}
