import type { NextRequest } from "next/server";
import { FieldValue, type Transaction } from "firebase-admin/firestore";
import { adminDb } from "@/lib/server/firebase-admin";
import { requireAuth } from "@/lib/server/auth";
import { ApiError, jsonError, jsonOk } from "@/lib/server/api-error";

export const runtime = "nodejs";

const MIN_DEPOSIT = 1_000;
const MAX_DEPOSIT_PER_TX = 10_000_000_000; // 100억 (의뢰자 확정: 입금 프리셋 최대 100억)

interface Body {
  amount?: unknown;
  method?: unknown;
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    const body = (await req.json().catch(() => ({}))) as Body;

    const amount = body.amount;
    if (
      typeof amount !== "number" ||
      !Number.isInteger(amount) ||
      amount < MIN_DEPOSIT ||
      amount > MAX_DEPOSIT_PER_TX
    ) {
      throw new ApiError(
        "INVALID_INPUT",
        `입금 금액은 ${MIN_DEPOSIT.toLocaleString()}P ~ ${MAX_DEPOSIT_PER_TX.toLocaleString()}P 사이여야 합니다.`,
        400,
        { field: "amount" },
      );
    }
    const method = typeof body.method === "string" ? body.method : "beta_virtual";

    const db = adminDb();
    const userRef = db.collection("users").doc(user.uid);

    const newBalance = await db.runTransaction(async (tx: Transaction) => {
      const snap = await tx.get(userRef);
      const current = (snap.exists ? snap.data()?.totalPoints || 0 : 0) as number;
      const next = current + amount;
      // 광고주 자격(입금 누적) 을 O(1) 로 읽기 위한 비정규화 — 강체크 PR #38 N-1.
      // 필드가 없는 기존 회원은 첫 입금 때 이 트랜잭션 안에서 거래 합산으로 채운다 (백필 스크립트 없이 자연 수렴).
      const prevDepositTotal = snap.exists ? snap.data()?.depositTotal : undefined;
      const baseDepositTotal =
        typeof prevDepositTotal === "number" && Number.isFinite(prevDepositTotal) ? prevDepositTotal : await sumDepositsInTx(tx, db, user.uid);
      const depositTotal = baseDepositTotal + amount;
      if (snap.exists) {
        tx.update(userRef, { totalPoints: next, depositTotal });
      } else {
        tx.set(userRef, {
          name: user.email?.split("@")[0] || "회원",
          email: user.email,
          role: "consumer",
          membershipLevel: 1,
          totalPoints: next,
          depositTotal,
          createdAt: FieldValue.serverTimestamp(),
        });
      }
      const txnRef = db.collection("transactions").doc();
      tx.create(txnRef, {
        consumerId: user.uid,
        type: "deposit",
        amount,
        method,
        totalAccumulation: amount,
        createdAt: FieldValue.serverTimestamp(),
      });
      return next;
    });

    return jsonOk({ ok: true, amount, newBalance });
  } catch (err) {
    return jsonError(err);
  }
}

/** depositTotal 필드가 없는 구 회원: 트랜잭션 읽기 단계에서 기존 입금 거래를 합산 (읽기 전부 → 쓰기 전부 순서 유지) */
async function sumDepositsInTx(tx: Transaction, db: FirebaseFirestore.Firestore, uid: string): Promise<number> {
  const q = db.collection("transactions").where("consumerId", "==", uid).where("type", "==", "deposit").select("amount");
  const snap = await tx.get(q);
  let sum = 0;
  snap.forEach((d) => {
    const a = d.data().amount;
    if (typeof a === "number" && Number.isFinite(a)) sum += a;
  });
  return sum;
}
