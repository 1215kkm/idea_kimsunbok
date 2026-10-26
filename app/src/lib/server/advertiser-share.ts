import { FieldValue, type DocumentReference, type Firestore, type Transaction } from "firebase-admin/firestore";

/**
 * 유치회원 지출 5% 광고주 적립 (의뢰자 확정: 광고주가 가입시킨 회원이 지출할 때마다 지출액의 5%를 광고주에게 지속 적립)
 *
 * 유치 관계 = 리워드 캠페인 코드로 가입 리워드를 받은 회원 → 그 캠페인의 광고주.
 * 리딤 때 남는 rewardPayouts/{회원 uid}.ownerUid 를 그대로 쓴다 (1인 1회라 광고주는 한 명).
 *
 * Firestore 트랜잭션은 "읽기 전부 → 쓰기 전부" 순서여야 하므로 두 단계로 나눈다.
 * 적립분은 지출 120% 증액분처럼 새로 생기는 포인트다 — 총량 검산에서 advertiser_share 로 따로 보인다.
 */
export const ADVERTISER_SHARE_TX = "advertiser_share";

export interface AdvertiserSharePlan {
  ownerUid: string;
  ownerRef: DocumentReference;
  ownerTotal: number;
  amount: number;
}

/** 읽기 단계: 이 회원을 유치한 광고주와 적립액을 찾는다. 없으면 null. */
export async function readAdvertiserShare(
  tx: Transaction,
  db: Firestore,
  consumerUid: string,
  reward: number,
): Promise<AdvertiserSharePlan | null> {
  const amount = Math.floor(reward);
  if (amount <= 0) return null;
  const payoutSnap = await tx.get(db.collection("rewardPayouts").doc(consumerUid));
  if (!payoutSnap.exists) return null;
  const ownerUid = payoutSnap.data()?.ownerUid;
  if (typeof ownerUid !== "string" || !ownerUid || ownerUid === consumerUid) return null;
  const ownerRef = db.collection("users").doc(ownerUid);
  const ownerSnap = await tx.get(ownerRef);
  if (!ownerSnap.exists) return null;
  const t = ownerSnap.data()?.totalPoints;
  const ownerTotal = typeof t === "number" && Number.isFinite(t) ? t : 0;
  return { ownerUid, ownerRef, ownerTotal, amount };
}

/** 쓰기 단계: 광고주 잔액에 더하고 광고주 내역에 남긴다. */
export function writeAdvertiserShare(
  tx: Transaction,
  db: Firestore,
  plan: AdvertiserSharePlan,
  ctx: { consumerUid: string; spendAmount: number; spendTxId: string },
): void {
  tx.update(plan.ownerRef, { totalPoints: plan.ownerTotal + plan.amount });
  tx.create(db.collection("transactions").doc(), {
    consumerId: plan.ownerUid,
    type: ADVERTISER_SHARE_TX,
    amount: plan.amount,
    totalAccumulation: plan.amount,
    spendAmount: ctx.spendAmount,
    fromUid: ctx.consumerUid,
    spendTxId: ctx.spendTxId,
    storeName: "유치회원 지출 적립 (5%)",
    createdAt: FieldValue.serverTimestamp(),
  });
}
