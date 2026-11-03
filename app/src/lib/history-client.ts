/**
 * 간단 화면(v2) 내역 — 거래를 "잔액이 얼마 늘었나/줄었나" 한 줄로 바꾼다.
 * 실서버(Firestore transactions) 또는 데모(localStorage).
 */
import { collection, getDocs, limit, orderBy, query, where } from "firebase/firestore";
import { db, isConfigured } from "@/lib/firebase";
import { getTransactions as getDemoTxs } from "@/lib/demo-store";
import { REWARD_TX_TYPES, rewardTxDeltas, type RewardTxType } from "@/lib/reward-ledger";

export interface HistoryItem {
  id: string;
  icon: string;
  title: string;
  /** 잔액 변화 (P). 0 이면 저장모드로 모으는 중 */
  delta: number;
  /** 지출 금액 (지출일 때만) */
  spent?: number;
  at: number | null;
}

interface RawTx {
  id: string;
  type?: string;
  categoryName?: string;
  storeMode?: string;
  amount?: number;
  totalAccumulation?: number;
  createdAt?: unknown;
}

function toMillis(v: unknown): number | null {
  if (typeof v === "number") return v;
  const t = v as { toMillis?: () => number } | null;
  return typeof t?.toMillis === "function" ? t.toMillis() : null;
}

export function toHistoryItem(t: RawTx): HistoryItem | null {
  const amount = Number(t.amount) || 0;
  const acc = Number(t.totalAccumulation) || 0;
  const at = toMillis(t.createdAt);
  const base = { id: t.id, at };
  switch (t.type || "spend") {
    case "deposit":
      return { ...base, icon: "💰", title: "돈 넣음", delta: amount };
    case "spend":
      return {
        ...base,
        icon: "🛒",
        title: t.categoryName || "지출",
        delta: acc,
        spent: amount,
      };
    case "spend_cancel":
      return { ...base, icon: "↩️", title: "결제 취소", delta: acc };
    case "withdrawal_request":
      return { ...base, icon: "🏦", title: "돈 찾기 신청", delta: -amount };
    case "withdrawal_refund":
      return { ...base, icon: "↩️", title: "찾기 취소", delta: amount };
    case "advertiser_share":
      return { ...base, icon: "📢", title: "광고 적립", delta: acc };
    case "invite_invitee":
    case "invite_advertiser":
      return { ...base, icon: "🎁", title: "초대 선물", delta: acc || amount };
    default:
      if ((REWARD_TX_TYPES as readonly string[]).includes(t.type!)) {
        const d = rewardTxDeltas(t.type as RewardTxType, amount).totalDelta;
        if (d === 0) return null; // 잠긴 예산 안에서만 움직인 기록
        const title = t.type === "reward_in" ? "가입 선물" : t.type === "reward_lock" ? "광고 예산" : "광고 예산 돌려받음";
        return { ...base, icon: "🎁", title, delta: d };
      }
      return null;
  }
}

export async function loadHistory(user: { uid: string; email?: string | null }, max = 30): Promise<HistoryItem[]> {
  let raw: RawTx[];
  if (!isConfigured || !db) {
    raw = getDemoTxs(user).slice(0, max);
  } else {
    const base = collection(db, "transactions");
    try {
      const snap = await getDocs(query(base, where("consumerId", "==", user.uid), orderBy("createdAt", "desc"), limit(max)));
      raw = snap.docs.map((d) => ({ ...(d.data() as Omit<RawTx, "id">), id: d.id }));
    } catch {
      // 정렬 인덱스가 없을 때: 정렬 없이 받아서 화면에서 정렬
      const snap = await getDocs(query(base, where("consumerId", "==", user.uid), limit(200)));
      raw = snap.docs.map((d) => ({ ...(d.data() as Omit<RawTx, "id">), id: d.id }));
    }
  }
  return raw
    .map(toHistoryItem)
    .filter((x): x is HistoryItem => x !== null)
    .sort((a, b) => (b.at ?? 0) - (a.at ?? 0))
    .slice(0, max);
}
