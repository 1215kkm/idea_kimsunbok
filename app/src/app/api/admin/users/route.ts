import type { NextRequest } from "next/server";
import { adminDb } from "@/lib/server/firebase-admin";
import { requireAdmin } from "@/lib/server/auth";
import { jsonError, jsonOk } from "@/lib/server/api-error";
import { ADVERTISER_MIN_DEPOSIT } from "@/lib/reward-ledger";
import type { AdminUser } from "@/lib/admin-types";

export const runtime = "nodejs";

function num(v: unknown): number {
  return typeof v === "number" && Number.isFinite(v) ? v : 0;
}

/**
 * GET /api/admin/users — 회원 200명 (최신 가입순)
 *  - lockedPoints 포함 (강체크 지적: 에스크로 잠김이 회원 화면에 없었음)
 *  - depositTotal / isAdvertiser: 광고주 자격 = 확인된 입금 누적 ≥ 100,000P (reward-service 와 같은 기준).
 *    입금 거래를 한 번에 읽어 uid 별로 합산한다 (회원마다 쿼리하지 않음).
 */
export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req);
    const db = adminDb();
    const [usersSnap, depositSnap] = await Promise.all([
      db.collection("users").orderBy("createdAt", "desc").limit(200).get(),
      db.collection("transactions").where("type", "==", "deposit").select("consumerId", "amount").get(),
    ]);

    const depositByUid = new Map<string, number>();
    depositSnap.forEach((d) => {
      const uid = d.data().consumerId as string | undefined;
      if (!uid) return;
      depositByUid.set(uid, (depositByUid.get(uid) || 0) + num(d.data().amount));
    });

    const items: AdminUser[] = usersSnap.docs.map((d) => {
      const data = d.data();
      const depositTotal = depositByUid.get(d.id) || 0;
      return {
        id: d.id,
        name: data.name || "",
        email: data.email || "",
        role: data.role || "consumer",
        memberType: typeof data.memberType === "string" ? data.memberType : "personal",
        totalPoints: num(data.totalPoints),
        lockedPoints: num(data.lockedPoints),
        depositTotal,
        isAdvertiser: depositTotal >= ADVERTISER_MIN_DEPOSIT,
        membershipLevel: num(data.membershipLevel) || 1,
        createdAt: data.createdAt?.toMillis?.() ?? null,
      };
    });
    return jsonOk({ ok: true, items, advertiserMinDeposit: ADVERTISER_MIN_DEPOSIT });
  } catch (err) {
    return jsonError(err);
  }
}
