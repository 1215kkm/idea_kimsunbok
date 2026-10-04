import type { NextRequest } from "next/server";
import { adminDb } from "@/lib/server/firebase-admin";
import { requireAuth } from "@/lib/server/auth";
import { jsonError, jsonOk } from "@/lib/server/api-error";
import { getOrdered } from "@/lib/server/firestore-query";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    const snap = await getOrdered(
      adminDb().collection("withdrawals").where("userId", "==", user.uid),
      "requestedAt",
      "desc",
      50,
    );
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
    items.sort((a, b) => (b.requestedAt ?? 0) - (a.requestedAt ?? 0));
    return jsonOk({ ok: true, items });
  } catch (err) {
    return jsonError(err);
  }
}
