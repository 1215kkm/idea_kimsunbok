import type { NextRequest } from "next/server";
import { adminDb } from "@/lib/server/firebase-admin";
import { requireAuth } from "@/lib/server/auth";
import { jsonError, jsonOk } from "@/lib/server/api-error";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    const snap = await adminDb()
      .collection("withdrawals")
      .where("userId", "==", user.uid)
      .orderBy("requestedAt", "desc")
      .limit(50)
      .get();
    const items = snap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        amount: data.amount,
        status: data.status,
        bank: data.bankInfo?.bank,
        accountNumber: data.bankInfo?.accountNumber,
        requestedAt: data.requestedAt?.toMillis?.() ?? null,
        processedAt: data.processedAt?.toMillis?.() ?? null,
        rejectReason: data.rejectReason ?? null,
      };
    });
    return jsonOk({ ok: true, items });
  } catch (err) {
    return jsonError(err);
  }
}
