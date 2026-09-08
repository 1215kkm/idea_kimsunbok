"use client";

import { useMemo, useState } from "react";
import { buildSharePack, splitCopy } from "@/lib/reward-copy-templates";
import { CHANNEL_LABEL, formatDate, formatP, statusBadge, type CampaignItem, type PayoutItem } from "./types";

interface Props {
  campaign: CampaignItem;
  payouts: PayoutItem[];
  payoutsLoading: boolean;
  /** 성공이면 null, 실패면 메시지 */
  onCancel: (id: string) => Promise<string | null>;
  onBack: () => void;
}

type ShareKey = "link" | "kakao" | "instagram" | "basic";

const SHARE_ROWS: { key: ShareKey; label: string; hint: string }[] = [
  { key: "link", label: "공유 링크", hint: "누르면 가입 화면에 코드가 미리 채워집니다" },
  { key: "kakao", label: "카카오톡 1줄", hint: "단톡·1:1 채팅용" },
  { key: "instagram", label: "인스타 스토리 2줄", hint: "스토리 텍스트용" },
  { key: "basic", label: "기본 문구", hint: "유튜브 설명란·네이버·페이스북·기타" },
];

export default function CampaignDetail({ campaign: c, payouts, payoutsLoading, onCancel, onBack }: Props) {
  const badge = statusBadge(c);
  const [copied, setCopied] = useState<ShareKey | null>(null);
  const [copyError, setCopyError] = useState<string | null>(null);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelBusy, setCancelBusy] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const shareable = c.status === "approved" || c.status === "live";
  const canShareApi = typeof navigator !== "undefined" && typeof navigator.share === "function";

  const pack = useMemo(() => {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    return buildSharePack({
      origin,
      code: c.code,
      copy: c.copy,
      templateId: c.templateId,
      vars: { owner: c.ownerName || "광고주", unit: c.unitAmount, headcount: c.headcount },
    });
  }, [c.code, c.copy, c.templateId, c.ownerName, c.unitAmount, c.headcount]);

  const { headline, body } = splitCopy(c.copy);

  const copyText = async (key: ShareKey) => {
    setCopyError(null);
    try {
      await navigator.clipboard.writeText(pack[key]);
      setCopied(key);
      window.setTimeout(() => setCopied((k) => (k === key ? null : k)), 1500);
    } catch (err) {
      console.error("[reward] clipboard write failed", err);
      setCopyError("복사에 실패했습니다. 문구를 길게 눌러 직접 복사해 주세요.");
    }
  };

  const shareNative = async () => {
    try {
      await navigator.share({ title: headline, text: pack.basic, url: pack.link });
    } catch (err) {
      // 사용자가 공유 시트를 닫은 경우(AbortError)는 정상
      if ((err as { name?: string })?.name !== "AbortError") {
        console.error("[reward] navigator.share failed", err);
        setCopyError("공유 시트를 열지 못했습니다. 복사 버튼을 이용해 주세요.");
      }
    }
  };

  const handleCancel = async () => {
    setCancelBusy(true);
    setCancelError(null);
    const msg = await onCancel(c.id);
    setCancelBusy(false);
    if (msg) setCancelError(msg);
    else setCancelOpen(false);
  };

  const progress = c.headcount > 0 ? Math.min(100, Math.round((c.paidCount / c.headcount) * 100)) : 0;

  return (
    <div className="space-y-4">
      <button type="button" onClick={onBack} className="text-xs text-[#6B7394] hover:text-[#3B4CCA]">
        &larr; 내 캠페인 목록
      </button>

      {/* 요약 */}
      <section className="rounded-2xl border border-[#E8EAF0] bg-white p-4 dark-card">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="text-base font-black leading-snug text-[#1A1F36]">{headline || "(문구 없음)"}</div>
            <div className="mt-0.5 text-xs text-[#6B7394]">
              {formatDate(c.createdAt)} 제출 · {c.channels.map((ch) => CHANNEL_LABEL[ch]).join(" · ")}
            </div>
          </div>
          <span className={`shrink-0 rounded-full border px-2.5 py-0.5 text-xs font-bold ${badge.className}`}>{badge.label}</span>
        </div>
        {c.status === "rejected" && c.rejectReason === "owner_cancelled" && (
          <div className="mt-2 rounded-lg border border-[#E8EAF0] bg-[#F7F8FC] px-3 py-2 text-xs text-[#6B7394]">
            내가 취소함 · {formatDate(c.createdAt)} 제출분 — 잠겼던 예산은 전액 반환되었습니다.
          </div>
        )}
        {c.status === "rejected" && c.rejectReason && c.rejectReason !== "owner_cancelled" && (
          <div className="mt-2 rounded-lg border border-[#EF4444]/30 bg-[#EF4444]/5 px-3 py-2 text-xs text-[#B91C1C]">거절 사유: {c.rejectReason}</div>
        )}
        <div className="mt-3 grid grid-cols-3 gap-2 text-center">
          <div className="rounded-xl bg-[#F7F8FC] p-2">
            <div className="text-xs text-[#6B7394]">1인당</div>
            <div className="text-sm font-bold text-[#1A1F36]">{formatP(c.unitAmount)}</div>
          </div>
          <div className="rounded-xl bg-[#F7F8FC] p-2">
            <div className="text-xs text-[#6B7394]">가입 회원</div>
            <div className="text-sm font-bold text-[#3B4CCA]">
              {c.paidCount}/{c.headcount}명
            </div>
          </div>
          <div className="rounded-xl bg-[#F7F8FC] p-2">
            <div className="text-xs text-[#6B7394]">{c.status === "ended" || c.status === "rejected" ? "반환됨" : "잔여 예산"}</div>
            <div className="text-sm font-bold text-[#1A1F36]">
              {formatP(c.status === "ended" || c.status === "rejected" ? c.budgetRefunded : c.budgetRemaining)}
            </div>
          </div>
        </div>
        <div className="mt-3">
          <div className="flex justify-between text-xs text-[#6B7394]">
            <span>지급 {formatP(c.budgetPaid)}</span>
            <span>잠금 {formatP(c.budgetLocked)}</span>
          </div>
          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-[#E8EAF0]">
            <div className="h-full rounded-full bg-[#3B4CCA] transition-all" style={{ width: `${progress}%` }} />
          </div>
        </div>
        {c.status === "pending_review" && (
          <div className="mt-3 flex items-center justify-between rounded-xl border border-amber-500/30 bg-amber-50 px-3 py-2 text-xs text-[#6B7394]">
            <span>관리자 승인 후 지급이 시작됩니다. 승인 전에는 취소할 수 있습니다.</span>
            <button type="button" onClick={() => setCancelOpen(true)} className="ml-2 shrink-0 rounded-lg border border-[#E8EAF0] bg-white px-3 py-1.5 font-bold text-[#6B7394] hover:text-[#B91C1C]">
              취소
            </button>
          </div>
        )}
      </section>

      {/* 코드 + 공유 팩 */}
      <section className="rounded-2xl border border-[#E8EAF0] bg-white p-4 dark-card">
        <div className="text-sm font-bold text-[#1A1F36]">가입 코드 · 공유 팩</div>
        <div className="mt-2 rounded-xl border border-[#E8EAF0] bg-[#F7F8FC] px-4 py-3 text-center">
          <div className="text-xs text-[#6B7394]">가입 코드</div>
          <div className="text-2xl font-black tracking-[0.3em] text-[#3B4CCA]">{c.code}</div>
        </div>
        {!shareable && (
          <div className="mt-2 rounded-lg border border-[#E8EAF0] bg-[#F7F8FC] px-3 py-2 text-xs text-[#6B7394]">
            {c.status === "pending_review"
              ? "승인 전입니다. 지금 공유하면 받는 사람이 가입해도 승인 전까지 지급되지 않습니다."
              : "이 캠페인은 지급이 끝났거나 중단된 상태입니다. 공유해도 지급되지 않습니다."}
          </div>
        )}
        <div className="mt-3 space-y-2">
          {SHARE_ROWS.map((row) => (
            <div key={row.key} className="rounded-xl border border-[#E8EAF0] p-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-[#1A1F36]">{row.label}</div>
                  <div className="text-xs text-[#9CA3C1]">{row.hint}</div>
                </div>
                <button
                  type="button"
                  onClick={() => copyText(row.key)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ${
                    copied === row.key ? "bg-[#10B981] text-white" : "bg-[#3B4CCA]/8 text-[#3B4CCA] hover:bg-[#3B4CCA]/15"
                  }`}
                >
                  {copied === row.key ? "복사됨" : "복사"}
                </button>
              </div>
              <pre className="mt-2 whitespace-pre-wrap break-all font-sans text-xs leading-relaxed text-[#6B7394]">{pack[row.key]}</pre>
            </div>
          ))}
        </div>
        {copyError && <div className="mt-2 text-xs text-[#B91C1C]">{copyError}</div>}
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => copyText("link")}
            className="rounded-xl bg-[#FFB800] py-3 text-sm font-bold text-[#1A1F36] hover:bg-[#E5A600]"
          >
            링크 복사
          </button>
          <button
            type="button"
            disabled={!canShareApi}
            onClick={shareNative}
            title={canShareApi ? "" : "이 브라우저는 공유 시트를 지원하지 않습니다"}
            className="rounded-xl border border-[#3B4CCA]/30 bg-[#3B4CCA]/5 py-3 text-sm font-bold text-[#3B4CCA] disabled:cursor-not-allowed disabled:opacity-40"
          >
            공유하기
          </button>
        </div>
        <div className="mt-3 flex items-center justify-between rounded-xl border border-dashed border-[#E8EAF0] px-3 py-2 text-xs text-[#6B7394]">
          <span>이미지 팩 (스토리·피드 이미지)</span>
          <span className="rounded-full bg-[#E8EAF0] px-2.5 py-0.5 text-xs font-bold">준비 중 · P1</span>
        </div>
        <p className="mt-2 text-xs leading-relaxed text-[#9CA3C1]">
          전화번호를 모아 문자·카톡을 보내는 기능은 제공하지 않습니다 (수신동의 없는 광고성 정보 전송은 정보통신망법 위반). 링크·문구는 광고주 본인 채널에 직접 올려 주세요.
        </p>
      </section>

      {/* 저장 문구 전문 */}
      <section className="rounded-2xl border border-[#E8EAF0] bg-white p-4 dark-card">
        <div className="text-sm font-bold text-[#1A1F36]">등록한 문구</div>
        <div className="mt-2 text-base font-black text-[#1A1F36]">{headline}</div>
        <div className="mt-1 whitespace-pre-line text-xs leading-relaxed text-[#6B7394]">{body}</div>
        <div className="mt-2 border-t border-[#E8EAF0] pt-2 text-xs text-[#6B7394]">{pack.honest}</div>
      </section>

      {/* 지급내역 */}
      <section className="rounded-2xl border border-[#E8EAF0] bg-white p-4 dark-card">
        <div className="flex items-center justify-between">
          <div className="text-sm font-bold text-[#1A1F36]">지급내역</div>
          <div className="text-xs text-[#6B7394]">{payouts.length}건 · {formatP(c.budgetPaid)}</div>
        </div>
        {payoutsLoading ? (
          <div className="py-6 text-center text-xs text-[#9CA3C1]">불러오는 중...</div>
        ) : payouts.length === 0 ? (
          <div className="py-6 text-center text-xs text-[#9CA3C1]">아직 지급된 회원이 없습니다.</div>
        ) : (
          <div className="mt-2 divide-y divide-[#E8EAF0]">
            {payouts.map((p) => (
              <div key={p.id} className="flex items-center justify-between py-2 text-xs">
                <div>
                  <div className="font-bold text-[#1A1F36]">회원 {p.inviteeMasked}</div>
                  <div className="text-xs text-[#9CA3C1]">{formatDate(p.paidAt)} · 가입 + 이메일 인증</div>
                </div>
                <div className="font-bold text-[#B91C1C]">-{formatP(p.amount)}</div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 성과 (P1) */}
      <section className="rounded-2xl border border-dashed border-[#E8EAF0] bg-[#F7F8FC] p-4">
        <div className="flex items-center justify-between">
          <div className="text-sm font-bold text-[#6B7394]">성과 (링크 클릭 → 가입 전환율)</div>
          <span className="rounded-full bg-[#E8EAF0] px-2.5 py-0.5 text-xs font-bold text-[#6B7394]">준비 중 · P1</span>
        </div>
        <p className="mt-1 text-xs text-[#9CA3C1]">지금은 지급내역만 집계됩니다. 채널별 도달·전환은 P1-5 에서 붙습니다.</p>
      </section>

      {cancelOpen && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/40 lg:items-center" onClick={() => !cancelBusy && setCancelOpen(false)}>
          <div className="w-full max-w-md rounded-t-2xl bg-white p-5 shadow-xl lg:rounded-2xl" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
            <div className="text-base font-bold text-[#1A1F36]">캠페인을 취소할까요?</div>
            <p className="mt-2 text-xs leading-relaxed text-[#6B7394]">
              잠긴 예산 <strong className="text-[#1A1F36]">{formatP(c.budgetRemaining)}</strong>가 전액 잔액으로 돌아옵니다. 취소한 캠페인은 되살릴 수 없고, 필요하면 새로 만들면 됩니다.
            </p>
            {cancelError && <div className="mt-2 text-xs text-[#B91C1C]">{cancelError}</div>}
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button type="button" disabled={cancelBusy} onClick={() => setCancelOpen(false)} className="rounded-xl border border-[#E8EAF0] bg-white py-3 text-sm font-bold text-[#6B7394] disabled:opacity-50">
                유지
              </button>
              <button type="button" disabled={cancelBusy} onClick={handleCancel} className="rounded-xl bg-[#EF4444] py-3 text-sm font-bold text-white hover:bg-[#DC2626] disabled:opacity-50">
                {cancelBusy ? "취소 중..." : "취소하고 반환"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
