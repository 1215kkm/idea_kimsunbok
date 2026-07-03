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
      if (snap.exists) {
        tx.update(userRef, { totalPoints: next });
      } else {
        tx.set(userRef, {
          name: user.email?.split("@")[0] || "회원",
          email: user.email,
          role: "consumer",
          membershipLevel: 1,
          totalPoints: next,
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
