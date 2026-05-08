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
    const db = adminDb();
    let q: FirebaseFirestore.Query =
      status === "all"
        ? db.collection("withdrawals").orderBy("requestedAt", "desc").limit(200)
        : db
            .collection("withdrawals")
            .where("status", "==", status)
            .orderBy("requestedAt", "desc")
            .limit(200);
    const snap = await q.get();

    const userIds = Array.from(
      new Set(snap.docs.map((d) => d.data().userId as string).filter(Boolean)),
    );
    const userMap = new Map<string, { name: string; email: string }>();
    if (userIds.length > 0) {
      const userRefs = userIds.map((uid) => db.collection("users").doc(uid));
      const userSnaps = await db.getAll(...userRefs);
      userSnaps.forEach((us) => {
        if (us.exists) {
          const ud = us.data() || {};
          userMap.set(us.id, {
            name: ud.name || "",
            email: ud.email || "",
          });
        }
      });
    }

    const items = snap.docs.map((d) => {
      const data = d.data();
      const u = userMap.get(data.userId);
      return {
        id: d.id,
        userId: data.userId,
        userName: u?.name ?? "",
        userEmail: u?.email ?? "",
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
