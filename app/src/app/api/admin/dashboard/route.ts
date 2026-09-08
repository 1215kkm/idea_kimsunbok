import type { NextRequest } from "next/server";
import { Timestamp } from "firebase-admin/firestore";
import { adminDb } from "@/lib/server/firebase-admin";
import { requireAdmin } from "@/lib/server/auth";
import { jsonError, jsonOk } from "@/lib/server/api-error";
import { seoulDayStart, type ActivityItem, type AdminDashboard } from "@/lib/admin-types";

export const runtime = "nodejs";

function num(v: unknown): number {
  return typeof v === "number" && Number.isFinite(v) ? v : 0;
}
function millis(v: unknown): number | null {
  const t = v as { toMillis?: () => number } | null;
  return t && typeof t.toMillis === "function" ? t.toMillis() : null;
}

/**
 * GET /api/admin/dashboard — 대시보드 KPI 4 + 최근 활동 20건 (기획서 §3.3 대시보드 행)
 *  - 오늘 = 한국 시간 00:00 이후
 *  - 복합 인덱스를 피하려고 range 쿼리는 단일 필드(createdAt)만 쓰고 type 은 메모리에서 거른다.
 */
export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req);
    const db = adminDb();
    const dayStart = Timestamp.fromMillis(seoulDayStart());

    const [todayUsersSnap, pendingCampaignsSnap, todayTxSnap, pendingWithdrawSnap, recentSnap] = await Promise.all([
      db.collection("users").where("createdAt", ">=", dayStart).select().get(),
      db.collection("rewardCampaigns").where("status", "==", "pending_review").select("createdAt").get(),
      db.collection("transactions").where("createdAt", ">=", dayStart).select("type", "amount").get(),
      db.collection("withdrawals").where("status", "==", "pending").select("amount").get(),
      db.collection("transactions").orderBy("createdAt", "desc").limit(20).get(),
    ]);

    let oldestPendingAt: number | null = null;
    pendingCampaignsSnap.forEach((d) => {
      const at = millis(d.data().createdAt);
      if (at !== null && (oldestPendingAt === null || at < oldestPendingAt)) oldestPendingAt = at;
    });

    let todayRewardPaid = 0;
    let todayRewardCount = 0;
    todayTxSnap.forEach((d) => {
      if (d.data().type === "reward_in") {
        todayRewardPaid += num(d.data().amount);
        todayRewardCount += 1;
      }
    });

    let pendingWithdrawalAmount = 0;
    pendingWithdrawSnap.forEach((d) => {
      pendingWithdrawalAmount += num(d.data().amount);
    });

    const userIds = Array.from(new Set(recentSnap.docs.map((d) => d.data().consumerId as string).filter(Boolean)));
    const userMap = new Map<string, { name: string; email: string }>();
    if (userIds.length > 0) {
      const snaps = await db.getAll(...userIds.map((uid) => db.collection("users").doc(uid)));
      snaps.forEach((s) => {
        if (s.exists) userMap.set(s.id, { name: s.data()?.name || "", email: s.data()?.email || "" });
      });
    }

    const recent: ActivityItem[] = recentSnap.docs.map((d) => {
      const t = d.data();
      const u = userMap.get(t.consumerId);
      return {
        id: d.id,
        at: millis(t.createdAt),
        userId: t.consumerId || "",
        userEmail: u?.email || "",
        userName: u?.name || "",
        type: typeof t.type === "string" ? t.type : "",
        amount: num(t.amount),
        totalAccumulation: num(t.totalAccumulation),
        campaignId: typeof t.campaignId === "string" ? t.campaignId : null,
        source: typeof t.source === "string" ? t.source : null,
        categoryName: typeof t.categoryName === "string" ? t.categoryName : null,
      };
    });

    const body: AdminDashboard = {
      generatedAt: Date.now(),
      todaySignups: todayUsersSnap.size,
      pendingCampaigns: pendingCampaignsSnap.size,
      oldestPendingAt,
      todayRewardPaid,
      todayRewardCount,
      pendingWithdrawals: pendingWithdrawSnap.size,
      pendingWithdrawalAmount,
      recent,
    };
    return jsonOk({ ok: true, ...body });
  } catch (err) {
    return jsonError(err);
  }
}
