/**
 * 관리자 화면 ↔ API 공용 타입 (서버·클라이언트·데모 공용, I/O 없음)
 */
import type { CampaignView } from "@/lib/server/reward-service";
import { seoulDateKey } from "@/lib/reward-ledger";

export type { CampaignView };

/** 한국 시간 기준 오늘 00:00 의 epoch ms */
export function seoulDayStart(now: number = Date.now()): number {
  return new Date(`${seoulDateKey(now)}T00:00:00+09:00`).getTime();
}

export interface ActivityItem {
  id: string;
  at: number | null;
  userId: string;
  userEmail: string;
  userName: string;
  type: string; // deposit | spend | withdrawal_request | withdrawal_refund | reward_lock | reward_out | reward_in | reward_refund | invite_* | ""
  amount: number;
  totalAccumulation: number;
  campaignId: string | null;
  source: string | null;
  categoryName: string | null;
}

export interface AdminDashboard {
  generatedAt: number;
  todaySignups: number;
  pendingCampaigns: number;
  oldestPendingAt: number | null;
  todayRewardPaid: number;
  todayRewardCount: number;
  pendingWithdrawals: number;
  pendingWithdrawalAmount: number;
  recent: ActivityItem[];
}

export interface PayoutItem {
  id: string; // = inviteeUid
  inviteeUid: string;
  inviteeEmail: string;
  amount: number;
  condition: string;
  status: string;
  paidAt: number | null;
}

export interface LedgerBucket {
  count: number;
  amount: number;
  totalDelta: number;
  lockedDelta: number;
}

export interface LedgerTotals {
  generatedAt: number;
  left: { totalPoints: number; lockedPoints: number; sum: number; userCount: number };
  right: { transactionsTotalDelta: number; transactionsLockedDelta: number; betaInitialFunds: number; sum: number };
  diff: number;
  byType: Record<string, LedgerBucket>;
  betaAdjustment: number;
  rewardNet: number;
  warnings: string[];
  transactionCount: number;
}

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: string;
  memberType: string; // personal | business
  totalPoints: number;
  lockedPoints: number;
  depositTotal: number;
  isAdvertiser: boolean;
  membershipLevel: number;
  createdAt: number | null;
}

export interface AdminWithdrawal {
  id: string;
  userId: string;
  userName?: string;
  userEmail?: string;
  amount: number;
  status: "pending" | "completed" | "rejected";
  bankInfo: { bank: string; accountNumber: string; holder: string };
  requestedAt: number | null;
  processedAt: number | null;
  rejectReason: string | null;
}

export const BANK_NAMES: Record<string, string> = {
  shinhan: "신한은행",
  kb: "국민은행",
  woori: "우리은행",
  hana: "하나은행",
  nh: "농협은행",
  kakao: "카카오뱅크",
  toss: "토스뱅크",
};

/** 최근 활동 유형 칩 라벨·색 (목업 §2.6 분류 칩) */
export const ACTIVITY_META: Record<string, { label: string; chip: "purple" | "blue" | "green" | "orange" | "pink" | "gray" | "red"; href: string }> = {
  deposit: { label: "입금", chip: "green", href: "/admin/deposits" },
  spend: { label: "지출", chip: "green", href: "/admin/spend" },
  withdrawal_request: { label: "출금 요청", chip: "blue", href: "/admin/withdrawals" },
  withdrawal_refund: { label: "출금 환불", chip: "blue", href: "/admin/withdrawals" },
  reward_lock: { label: "캠페인 제출", chip: "orange", href: "/admin/reward" },
  reward_out: { label: "리워드 지급 (광고주)", chip: "purple", href: "/admin/reward" },
  reward_in: { label: "리워드 지급", chip: "purple", href: "/admin/reward" },
  reward_refund: { label: "예산 반환", chip: "orange", href: "/admin/reward" },
  invite_invitee: { label: "구 초대 (베타)", chip: "red", href: "/admin/ledger" },
  invite_advertiser: { label: "구 초대 수익 (베타)", chip: "red", href: "/admin/ledger" },
};
