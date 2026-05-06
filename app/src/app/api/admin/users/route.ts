import type { NextRequest } from "next/server";
import { adminDb } from "@/lib/server/firebase-admin";
import { requireAdmin } from "@/lib/server/auth";
import { jsonError, jsonOk } from "@/lib/server/api-error";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req);
    const snap = await adminDb()
      .collection("users")
      .orderBy("createdAt", "desc")
      .limit(200)
      .get();
    const items = snap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        name: data.name || "",
        email: data.email || "",
        role: data.role || "consumer",
        totalPoints: data.totalPoints || 0,
        membershipLevel: data.membershipLevel || 1,
        createdAt: data.createdAt?.toMillis?.() ?? null,
      };
    });
    return jsonOk({ ok: true, items });
  } catch (err) {
    return jsonError(err);
  }
}
