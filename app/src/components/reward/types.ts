/**
 * 리워드광고 사용자 화면 공용 타입·라벨 (서버 CampaignView 와 데모 DemoCampaign 을 같은 모양으로 맞춘다)
 */
import type { CampaignStatus, RewardChannel, RewardKind } from "@/lib/reward-ledger";

export interface CampaignItem {
  id: string;
  code: string;
  kind: RewardKind;
  unitAmount: number;
  headcount: number;
  budgetLocked: number;
  budgetPaid: number;
  budgetRefunded: number;
  budgetRemaining: number;
  paidCount: number;
  channels: RewardChannel[];
  copy: string;
  templateId: string | null;
  ownerName: string;
  status: CampaignStatus;
  rejectReason: string | null;
  createdAt: number | null;
}

export interface PayoutItem {
  id: string;
  inviteeMasked: string;
  amount: number;
  paidAt: number | null;
}

export interface AdvertiserInfo {
  depositTotal: number;
  required: number;
  qualified: boolean;
  totalPoints: number;
  lockedPoints: number;
}

export interface CreateCampaignPayload {
  kind: RewardKind;
  unitAmount: number;
  headcount: number;
  channels: RewardChannel[];
  copy: string;
  templateId: string | null;
  ownerName: string;
}

export const CHANNEL_LABEL: Record<RewardChannel, string> = {
  youtube: "유튜브",
  kakao: "카카오톡",
  instagram: "인스타그램",
  naver: "네이버",
  facebook: "페이스북",
  other: "기타",
};

export interface StatusBadge {
  label: string;
  className: string;
}

/** 상태 배지 — 승인 대기·진행 중·일시정지·종료·거절/취소 */
export function statusBadge(c: Pick<CampaignItem, "status" | "rejectReason">): StatusBadge {
  switch (c.status) {
    case "pending_review":
      return { label: "승인 대기", className: "bg-amber-50 text-amber-700 border-amber-500/30" };
    case "approved":
    case "live":
      return { label: "진행 중", className: "bg-[#10B981]/10 text-[#047857] border-[#10B981]/30" };
    case "paused":
      return { label: "일시정지", className: "bg-[#F7F8FC] text-[#6B7394] border-[#E8EAF0]" };
    case "ended":
      return { label: "종료", className: "bg-[#F7F8FC] text-[#6B7394] border-[#E8EAF0]" };
    case "rejected":
      return c.rejectReason === "owner_cancelled"
        ? { label: "취소", className: "bg-[#F7F8FC] text-[#6B7394] border-[#E8EAF0]" }
        : { label: "거절", className: "bg-[#EF4444]/10 text-[#B91C1C] border-[#EF4444]/30" };
    default:
      return { label: "임시", className: "bg-[#F7F8FC] text-[#6B7394] border-[#E8EAF0]" };
  }
}

export function formatP(n: number): string {
  return `${n.toLocaleString("ko-KR")}P`;
}

export function formatDate(ms: number | null): string {
  if (!ms) return "-";
  const d = new Date(ms);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
}
