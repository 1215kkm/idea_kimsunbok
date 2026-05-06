import type { NextRequest } from "next/server";
import { adminDb } from "@/lib/server/firebase-admin";
import { requireAdmin } from "@/lib/server/auth";
import { jsonError, jsonOk } from "@/lib/server/api-error";

export const runtime = "nodejs";

const VALID_STATUS = ["pending", "completed", "rejected", "all"];

export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req);
    const url = new URL(req.url);
    const status = url.searchParams.get("status") || "pending";
    if (!VALID_STATUS.includes(status)) {
      return jsonOk({ ok: true, items: [] });
    }
    let q: FirebaseFirestore.Query = adminDb()
      .collection("withdrawals")
      .orderBy("requestedAt", "desc")
      .limit(200);
    if (status !== "all") {
      q = adminDb()
        .collection("withdrawals")
        .where("status", "==", status)
        .orderBy("requestedAt", "desc")
        .limit(200);
    }
    const snap = await q.get();
    const items = snap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        userId: data.userId,
        amount: data.amount,
        status: data.status,
        bankInfo: data.bankInfo,
        requestedAt: data.requestedAt?.toMillis?.() ?? null,
        processedAt: data.processedAt?.toMillis?.() ?? null,
        processedBy: data.processedBy ?? null,
        rejectReason: data.rejectReason ?? null,
      };
    });
    return jsonOk({ ok: true, items });
  } catch (err) {
    return jsonError(err);
  }
}
