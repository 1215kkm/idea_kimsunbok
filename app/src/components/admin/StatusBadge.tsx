import type { CampaignStatus } from "@/lib/reward-ledger";

export type BadgeTone = "pending" | "live" | "paused" | "ended" | "rejected" | "ok" | "mismatch";

export const CAMPAIGN_STATUS_LABEL: Record<CampaignStatus, string> = {
  draft: "임시",
  pending_review: "승인 대기",
  approved: "승인됨",
  live: "진행 중",
  paused: "일시정지",
  ended: "종료",
  rejected: "거절",
};

export function campaignTone(status: CampaignStatus): BadgeTone {
  switch (status) {
    case "pending_review":
    case "draft":
      return "pending";
    case "approved":
    case "live":
      return "live";
    case "paused":
      return "paused";
    case "ended":
      return "ended";
    case "rejected":
      return "rejected";
  }
}

export default function StatusBadge({ tone, label, large = false }: { tone: BadgeTone; label: string; large?: boolean }) {
  return <span className={`ad-badge ${tone} ${large ? "lg" : ""}`.trim()}>{label}</span>;
}

export function CampaignStatusBadge({ status, large = false }: { status: CampaignStatus; large?: boolean }) {
  return <StatusBadge tone={campaignTone(status)} label={CAMPAIGN_STATUS_LABEL[status]} large={large} />;
}
