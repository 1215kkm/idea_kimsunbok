import type { NextRequest } from "next/server";
import { FieldValue, type Transaction } from "firebase-admin/firestore";
import { adminDb } from "@/lib/server/firebase-admin";
import { requireAuth } from "@/lib/server/auth";
import { ApiError, jsonError, jsonOk } from "@/lib/server/api-error";
import {
  isValidCategory,
  SPEND_CATEGORIES,
  MAX_SPEND_PER_TX,
  MIN_SPEND_PER_TX,
} from "@/lib/server/spend-categories";
import { calculateNonlinear, determineTier, calculateSplitCount } from "@/lib/nonlinear-engine";
import { getSplitMode, SPLIT_AUTO_LIMIT } from "@/lib/server/system-settings";

export const runtime = "nodejs";

interface Body {
  categoryId?: unknown;
  spendAmount?: unknown;
  memo?: unknown;
}

function sanitizeMemo(input: unknown): string {
  if (typeof input !== "string") return "";
  return input.replace(/[\u0000-\u001F\u007F]/g, "").trim().slice(0, 200);
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    const body = (await req.json().catch(() => ({}))) as Body;

    if (!isValidCategory(body.categoryId)) {
      throw new ApiError("INVALID_INPUT", "Invalid categoryId", 400, { field: "categoryId" });
    }
    const spendAmount = body.spendAmount;
    if (
      typeof spendAmount !== "number" ||
      !Number.isInteger(spendAmount) ||
      spendAmount < MIN_SPEND_PER_TX ||
      spendAmount > MAX_SPEND_PER_TX
    ) {
      throw new ApiError("INVALID_INPUT", "Invalid spendAmount", 400, { field: "spendAmount" });
    }
    const memo = sanitizeMemo(body.memo);
    const category = SPEND_CATEGORIES[body.categoryId];

    const nl = calculateNonlinear(spendAmount);
    // 분할모드 (의뢰자 확정): 10억P까지 자동, 초과분은 관리자 수동 모드에서 별도 처리
    const splitMode = await getSplitMode();
    const isManualSplit = splitMode === "manual" && spendAmount > SPLIT_AUTO_LIMIT;
    const db = adminDb();
    const userRef = db.collection("users").doc(user.uid);

    const newBalance = await db.runTransaction(async (tx: Transaction) => {
      const snap = await tx.get(userRef);
      const current = (snap.exists ? snap.data()?.totalPoints || 0 : 0) as number;
      // Model A: 잔액에서 spendAmount 차감 후 비선형공식 120% 적립 (순 +20%)
      if (current < spendAmount) {
        throw new ApiError(
          "INSUFFICIENT_BALANCE",
          "잔액이 부족합니다. 입금 후 다시 시도해 주세요.",
          400,
          { current, spendAmount },
        );
      }
      const next = current - spendAmount + nl.totalAccumulation;
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
      // 단계(Tier) 결정 + 분할 회수 계산 (의뢰자 새 공식 반영)
      const tier = determineTier(current);
      const splitCount = calculateSplitCount(spendAmount, tier);

      const txRef = db.collection("transactions").doc();
      tx.create(txRef, {
        consumerId: user.uid,
        type: "spend",
        isEmptyLog: true, // 의뢰자 새 공식: 카드 지출 = 빈로그(d1)
        tier: tier.level,
        tierLabel: tier.label,
        splitCount,
        splitMode, // auto | manual (관리자 설정)
        manualSplitPending: isManualSplit, // 수동 모드 + 10억 초과 거래 표시
        category: body.categoryId,
        categoryName: category.name,
        storeName: memo || category.name,
        amount: spendAmount,
        memo: memo || "",
        nonlinearResult: {
          principal: nl.principal,
          bonus: nl.bonus,
          totalAccumulation: nl.totalAccumulation,
          rate: nl.rate,
          memberCount: nl.memberCount,
          perMemberAmount: nl.perMemberAmount,
          advertiserReward: nl.advertiser.advertiserReward,
          // 분배 체인 상세 (a→f)
          distributionChain: nl.distributionChain,
        },
        totalAccumulation: nl.totalAccumulation,
        createdAt: FieldValue.serverTimestamp(),
      });
      return next;
    });

    const tier = determineTier(newBalance);
    const splitCount = calculateSplitCount(spendAmount, tier);

    return jsonOk({
      ok: true,
      totalAccumulation: nl.totalAccumulation,
      bonus: nl.bonus,
      principal: nl.principal,
      memberCount: nl.memberCount,
      perMemberAmount: nl.perMemberAmount,
      advertiserReward: nl.advertiser.advertiserReward,
      newBalance,
      tier: { level: tier.level, label: tier.label, consumerStep: tier.consumerStep },
      splitCount,
      splitMode,
      isEmptyLog: true,
    });
  } catch (err) {
    return jsonError(err);
  }
}
