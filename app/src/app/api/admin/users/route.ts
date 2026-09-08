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
 *    users.depositTotal (비정규화 필드, /api/deposit 이 갱신) 을 우선 쓰고, 필드가 없는 구 회원이 하나라도 있을 때만
 *    입금 거래를 스캔해 폴백한다 (강체크 PR #38 N-1). 전원 필드가 있으면 스캔 0회.
 */
export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req);
    const db = adminDb();
    const usersSnap = await db.collection("users").orderBy("createdAt", "desc").limit(200).get();

    const missing = usersSnap.docs.filter((d) => typeof d.data().depositTotal !== "number");
    const depositByUid = new Map<string, number>();
    if (missing.length > 0) {
      const depositSnap = await db.collection("transactions").where("type", "==", "deposit").select("consumerId", "amount").get();
      depositSnap.forEach((d) => {
        const uid = d.data().consumerId as string | undefined;
        if (!uid) return;
        depositByUid.set(uid, (depositByUid.get(uid) || 0) + num(d.data().amount));
      });
    }

    const items: AdminUser[] = usersSnap.docs.map((d) => {
      const data = d.data();
      const depositTotal = typeof data.depositTotal === "number" ? data.depositTotal : depositByUid.get(d.id) || 0;
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
    return jsonOk({ ok: true, items, advertiserMinDeposit: ADVERTISER_MIN_DEPOSIT, depositScanFallback: missing.length });
  } catch (err) {
    return jsonError(err);
  }
}
