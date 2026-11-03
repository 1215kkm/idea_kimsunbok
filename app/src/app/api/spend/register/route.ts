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
import { readAdvertiserShare, writeAdvertiserShare } from "@/lib/server/advertiser-share";
import { planSmallSpend, type SmallSpendPlan } from "@/lib/small-spend";

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

    // 분할모드 (의뢰자 확정): 10억P까지 자동, 초과분은 관리자 수동 모드에서 별도 처리
    const splitMode = await getSplitMode();
    // >= : 10억(=MAX_SPEND_PER_TX) 거래도 수동 모드에선 pending 대상
    const isManualSplit = splitMode === "manual" && spendAmount >= SPLIT_AUTO_LIMIT;
    const db = adminDb();
    const userRef = db.collection("users").doc(user.uid);

    let preBalance = 0; // 지출 전 잔액 (응답 tier를 DB 기록과 동일 기준으로)
    let plan: SmallSpendPlan = planSmallSpend(0, spendAmount);
    // 트랜잭션 콜백 안에서 정해진다 (as: 선언 시 null 로 좁혀지지 않게)
    let nl = null as ReturnType<typeof calculateNonlinear> | null;
    const newBalance = await db.runTransaction(async (tx: Transaction) => {
      const snap = await tx.get(userRef);
      const current = (snap.exists ? snap.data()?.totalPoints || 0 : 0) as number;
      preBalance = current;
      // Model A: 잔액에서 spendAmount 차감 후 비선형공식 120% 적립 (순 +20%)
      if (current < spendAmount) {
        throw new ApiError(
          "INSUFFICIENT_BALANCE",
          "잔액이 부족합니다. 입금 후 다시 시도해 주세요.",
          400,
          { current, spendAmount },
        );
      }
      // 저장모드 (약관 제14조②): 1,000원 미만은 모아 두었다가 1,000원이 되면 모은 금액 전체를 적립
      plan = planSmallSpend(snap.exists ? snap.data()?.smallSpendPending : 0, spendAmount);
      nl = plan.processAmount > 0 ? calculateNonlinear(plan.processAmount) : null;
      const accumulation = nl?.totalAccumulation ?? 0;
      // 이 회원을 유치한 광고주 (읽기는 쓰기보다 먼저)
      const share = nl ? await readAdvertiserShare(tx, db, user.uid, nl.advertiser.advertiserReward) : null;
      const next = current - spendAmount + accumulation;
      if (snap.exists) {
        tx.update(userRef, { totalPoints: next, smallSpendPending: plan.nextPending });
      } else {
        tx.set(userRef, {
          name: user.email?.split("@")[0] || "회원",
          email: user.email,
          role: "consumer",
          membershipLevel: 1,
          totalPoints: next,
          smallSpendPending: plan.nextPending,
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
        storeMode: plan.mode, // normal | stored(모아 두는 중) | released(모은 금액 적립)
        processedAmount: plan.processAmount,
        nonlinearResult: nl
          ? {
              principal: nl.principal,
              bonus: nl.bonus,
              totalAccumulation: nl.totalAccumulation,
              rate: nl.rate,
              memberCount: nl.memberCount,
              perMemberAmount: nl.perMemberAmount,
              advertiserReward: nl.advertiser.advertiserReward,
              // 분배 체인 상세 (a→f)
              distributionChain: nl.distributionChain,
            }
          : null,
        totalAccumulation: accumulation,
        advertiserShareTo: share?.ownerUid ?? null,
        createdAt: FieldValue.serverTimestamp(),
      });
      if (share) {
        writeAdvertiserShare(tx, db, share, { consumerUid: user.uid, spendAmount: plan.processAmount, spendTxId: txRef.id });
      }
      return next;
    });

    const tier = determineTier(preBalance);
    const splitCount = calculateSplitCount(spendAmount, tier);

    return jsonOk({
      ok: true,
      totalAccumulation: nl?.totalAccumulation ?? 0,
      bonus: nl?.bonus ?? 0,
      principal: nl?.principal ?? 0,
      memberCount: nl?.memberCount ?? 0,
      perMemberAmount: nl?.perMemberAmount ?? 0,
      advertiserReward: nl?.advertiser.advertiserReward ?? 0,
      storeMode: plan.mode,
      processedAmount: plan.processAmount,
      smallSpendPending: plan.nextPending,
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
