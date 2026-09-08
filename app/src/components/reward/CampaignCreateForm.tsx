"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  MAX_HEADCOUNT,
  MIN_HEADCOUNT,
  REWARD_CHANNELS,
  REWARD_UNIT_AMOUNTS,
  type RewardChannel,
  type RewardKind,
} from "@/lib/reward-ledger";
import {
  COPY_TEMPLATES,
  findBrandWarnings,
  findForbiddenTerms,
  getTemplate,
  honestLine,
  renderTemplate,
  splitCopy,
  type CopyTemplateId,
} from "@/lib/reward-copy-templates";
import { CHANNEL_LABEL, formatP, type CreateCampaignPayload } from "./types";

const HEADCOUNT_PRESETS = [10, 50, 100];

function unitLabel(p: number): string {
  if (p >= 10_000_000) return `${p / 10_000_000}천만P`;
  if (p >= 1_000_000) return `${p / 1_000_000}백만P`;
  return `${p / 10_000}만P`;
}

interface Props {
  balance: number;
  qualified: boolean;
  defaultOwnerName: string;
  /** 성공이면 null, 실패면 사용자에게 보여줄 메시지 */
  onSubmit: (payload: CreateCampaignPayload) => Promise<string | null>;
  onCancel: () => void;
}

const sectionCls = "rounded-2xl border border-[#E8EAF0] bg-white p-4 dark-card";
const stepCls = "mb-3 flex items-center gap-2 text-sm font-bold text-[#1A1F36]";
const stepNoCls = "flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#3B4CCA] text-xs font-black text-white";

/** 타일 — 터치 타겟 44px 확보(py-3 + 12px 글자), 누르는 맛 active:scale */
function tileCls(active: boolean, disabled = false): string {
  const base = "rounded-xl border py-3 text-xs font-bold transition-all";
  if (disabled) return `${base} cursor-not-allowed border-dashed border-[#E8EAF0] bg-[#F7F8FC] text-[#9CA3C1]`;
  return active
    ? `${base} border-[#3B4CCA] bg-[#3B4CCA]/8 text-[#3B4CCA] active:scale-[0.98]`
    : `${base} border-[#E8EAF0] bg-white text-[#6B7394] hover:border-[#3B4CCA]/40 active:scale-[0.98]`;
}

export default function CampaignCreateForm({ balance, qualified, defaultOwnerName, onSubmit, onCancel }: Props) {
  const [kind] = useState<RewardKind>("new_member");
  const [unitAmount, setUnitAmount] = useState<number>(REWARD_UNIT_AMOUNTS[0]);
  const [headcount, setHeadcount] = useState<number>(HEADCOUNT_PRESETS[0]);
  const [headcountText, setHeadcountText] = useState<string>(String(HEADCOUNT_PRESETS[0]));
  const [channels, setChannels] = useState<RewardChannel[]>(["kakao"]);
  const [ownerName, setOwnerName] = useState<string>(defaultOwnerName);
  const [templateId, setTemplateId] = useState<CopyTemplateId>("plain");
  // 광고주가 손대기 전(null)까지는 템플릿·변수를 따라가고, 손대면 그 값을 유지한다 (effect 로 state 동기화하지 않음)
  const [customCopy, setCustomCopy] = useState<string | null>(null);
  const [kindOpen, setKindOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const owner = ownerName.trim() || "광고주";
  const template = getTemplate(templateId)!;
  const rendered = useMemo(
    () => renderTemplate(template, { owner, unit: unitAmount, headcount, code: "" }),
    [template, owner, unitAmount, headcount],
  );

  const copy = customCopy ?? rendered.copy;
  const copyDirty = customCopy !== null;

  const budget = unitAmount * headcount;
  const shortfall = Math.max(0, budget - balance);
  const headcountValid = Number.isInteger(headcount) && headcount >= MIN_HEADCOUNT && headcount <= MAX_HEADCOUNT;
  const forbidden = useMemo(() => findForbiddenTerms(`${copy}\n${owner}`), [copy, owner]);
  const brandWarnings = useMemo(() => findBrandWarnings(`${copy}\n${owner}`), [copy, owner]);
  const preview = splitCopy(copy);

  // 제출을 막는 이유 — 고정 바에 첫 줄 하나만 보여준다 (같은 말을 세 곳에 쓰지 않는다)
  const blockers: string[] = [];
  if (!qualified) blockers.push("광고주 자격(입금 누적 10만P)이 아직 없습니다.");
  if (!headcountValid) blockers.push(`모집 인원은 ${MIN_HEADCOUNT}~${MAX_HEADCOUNT.toLocaleString()}명 사이여야 합니다.`);
  if (shortfall > 0) blockers.push(`잔액이 ${formatP(shortfall)} 부족합니다.`);
  if (channels.length === 0) blockers.push("채널을 하나 이상 고르세요.");
  if (copy.trim().length === 0) blockers.push("광고 문구가 비어 있습니다.");
  if (forbidden.length > 0) blockers.push(`쓸 수 없는 표현이 있습니다: ${forbidden.join(", ")}`);
  const canSubmit = blockers.length === 0 && !submitting;

  const toggleChannel = (ch: RewardChannel) => {
    setChannels((prev) => (prev.includes(ch) ? prev.filter((c) => c !== ch) : [...prev, ch]));
  };

  const applyHeadcount = (text: string) => {
    const digits = text.replace(/[^0-9]/g, "").slice(0, 5);
    setHeadcountText(digits);
    setHeadcount(digits ? parseInt(digits, 10) : 0);
  };

  const handleConfirm = async () => {
    setSubmitting(true);
    setSubmitError(null);
    const msg = await onSubmit({
      kind,
      unitAmount,
      headcount,
      channels,
      copy: copy.trim(),
      templateId, // 문구를 수정해도 공유 팩(카톡 1줄·인스타 2줄)은 이 템플릿 변수로 만든다
      ownerName: ownerName.trim(),
    });
    setSubmitting(false);
    if (msg) {
      setSubmitError(msg);
      setConfirmOpen(false);
    }
  };

  return (
    <div className="space-y-4 pb-24">
      {/* 광고 종류 — 지금은 선택지가 하나뿐이라 결정 단계가 아니다. 한 줄 칩 + 펼치면 설명 */}
      <button
        type="button"
        onClick={() => setKindOpen((v) => !v)}
        className="flex w-full items-center gap-2 rounded-xl border border-[#3B4CCA]/30 bg-[#3B4CCA]/5 px-3 py-2.5 text-left active:scale-[0.98]"
      >
        <span className="text-base">👤</span>
        <span className="flex-1 text-xs font-bold text-[#3B4CCA]">신규 회원 가입 리워드</span>
        <span className="text-xs text-[#6B7394]">기존 DB 연동은 P2</span>
        <span className="material-symbols-outlined text-[#6B7394]" style={{ fontSize: "18px" }}>
          {kindOpen ? "expand_less" : "expand_more"}
        </span>
      </button>
      {kindOpen && (
        <div className="-mt-2 rounded-xl border border-[#E8EAF0] bg-white p-3 text-xs leading-relaxed text-[#6B7394] dark-card">
          <p>SNS·카톡 등으로 내 가입 코드를 공유하고, 새로 가입한 회원에게 1인당 정액을 내 예산에서 지급합니다.</p>
          <p className="mt-2 text-[#9CA3C1]">
            기존사이트 회원에게 지급하려면 개인정보 제3자 제공 계약이 먼저 필요합니다. 계약 체결 후 제공 예정 (P2).
          </p>
        </div>
      )}

      {/* ① 예산 = 1인당 금액 × 모집 인원 (의뢰자 시안도 금액 선택과 합계가 한 카드) */}
      <section className={sectionCls}>
        <div className={stepCls}>
          <span className={stepNoCls}>1</span> 예산 <span className="text-xs font-normal text-[#6B7394]">(1P = 1원)</span>
        </div>

        <label className="block text-xs text-[#6B7394]">1인당 지급 금액</label>
        <div className="mt-1 grid grid-cols-5 gap-2">
          {REWARD_UNIT_AMOUNTS.map((p) => (
            <button key={p} type="button" onClick={() => setUnitAmount(p)} className={tileCls(unitAmount === p)}>
              {unitLabel(p)}
            </button>
          ))}
          <button type="button" disabled className={tileCls(false, true)} title="지금은 4종 프리셋만 — 직접 입력은 원장 검증 규칙 확장 후(P1)">
            직접 입력
          </button>
        </div>
        <p className="mt-1 text-xs text-[#9CA3C1]">직접 입력은 P1에서 열립니다.</p>

        <label className="mt-4 block text-xs text-[#6B7394]">모집 인원</label>
        <div className="mt-1 grid grid-cols-4 gap-2">
          {HEADCOUNT_PRESETS.map((n) => (
            <button key={n} type="button" onClick={() => applyHeadcount(String(n))} className={tileCls(headcount === n)}>
              {n}명
            </button>
          ))}
          <input
            type="text"
            inputMode="numeric"
            value={headcountText}
            onChange={(e) => applyHeadcount(e.target.value)}
            placeholder="직접"
            aria-label="모집 인원 직접 입력"
            className={`dark-input rounded-xl border px-2 py-3 text-center text-xs font-bold outline-none ${
              HEADCOUNT_PRESETS.includes(headcount) ? "border-[#E8EAF0] text-[#6B7394]" : "border-[#3B4CCA] text-[#3B4CCA]"
            }`}
          />
        </div>

        <div className="mt-4 rounded-xl bg-[#F7F8FC] p-3">
          <div className="flex items-center justify-between text-xs text-[#6B7394]">
            <span>
              {formatP(unitAmount)} × {headcountValid ? headcount : 0}명
            </span>
            <span>제출 시 잠기는 예산</span>
          </div>
          <div className="mt-1 text-2xl font-black text-[#3B4CCA]">{formatP(headcountValid ? budget : 0)}</div>
          <div className="mt-1 flex items-center justify-between text-xs">
            <span className="text-[#6B7394]">사용 가능 잔액 {formatP(balance)}</span>
            <span className="font-bold text-[#1A1F36]">광고주가 얻는 것: 회원 {headcountValid ? headcount : 0}명</span>
          </div>
          {shortfall > 0 && (
            <div className="mt-2 rounded-lg border border-[#EF4444]/30 bg-[#EF4444]/5 px-3 py-2 text-xs text-[#B91C1C]">
              잔액이 <strong>{formatP(shortfall)}</strong> 부족합니다.{" "}
              <Link href="/deposit" className="underline">
                입금하기 →
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* ② 채널 */}
      <section className={sectionCls}>
        <div className={stepCls}>
          <span className={stepNoCls}>2</span> 공유할 채널 <span className="text-xs font-normal text-[#6B7394]">(복수 선택)</span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {REWARD_CHANNELS.map((ch) => (
            <button key={ch} type="button" onClick={() => toggleChannel(ch)} className={tileCls(channels.includes(ch))}>
              <span className="inline-flex items-center justify-center gap-1">
                {channels.includes(ch) && (
                  <span className="material-symbols-outlined" style={{ fontSize: "16px" }} aria-hidden="true">
                    check
                  </span>
                )}
                {CHANNEL_LABEL[ch]}
              </span>
            </button>
          ))}
        </div>
        <p className="mt-2 text-xs leading-relaxed text-[#6B7394]">
          다랜드가 대신 게시하거나 발송하지 않습니다. 제출 후 받는 공유 팩(링크·문구)을 광고주가 직접 올립니다.
        </p>
      </section>

      {/* ③ 문구 + 미리보기 */}
      <section className={sectionCls}>
        <div className={stepCls}>
          <span className={stepNoCls}>3</span> 광고 문구
        </div>
        <label className="block text-xs text-[#6B7394]">광고주 표시명 (가게·회사·닉네임)</label>
        <input
          type="text"
          value={ownerName}
          maxLength={30}
          onChange={(e) => setOwnerName(e.target.value)}
          placeholder="예: 김밥천국"
          className="dark-input mt-1 mb-3 w-full rounded-xl border border-[#E8EAF0] bg-white px-3 py-2.5 text-sm outline-none focus:border-[#3B4CCA]"
        />
        <div className="grid grid-cols-3 gap-2">
          {COPY_TEMPLATES.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => {
                setTemplateId(t.id);
                setCustomCopy(null);
              }}
              className={`rounded-xl border py-3 text-xs font-bold transition-all active:scale-[0.98] ${
                templateId === t.id
                  ? "border-[#3B4CCA] bg-[#3B4CCA]/8 text-[#3B4CCA]"
                  : "border-[#E8EAF0] bg-white text-[#6B7394] hover:border-[#3B4CCA]/40"
              }`}
            >
              {t.name}
            </button>
          ))}
        </div>
        <p className="mt-1 text-xs text-[#6B7394]">{template.tone}</p>

        <div className="mt-3 flex items-center justify-between">
          <label className="text-xs text-[#6B7394]">첫 줄 = 헤드라인(20자 권장), 둘째 줄부터 본문</label>
          {copyDirty && (
            <button type="button" onClick={() => setCustomCopy(null)} className="text-xs text-[#3B4CCA] underline">
              템플릿 문구로 되돌리기
            </button>
          )}
        </div>
        <textarea
          value={copy}
          rows={4}
          maxLength={500}
          onChange={(e) => setCustomCopy(e.target.value)}
          className={`dark-input mt-1 w-full rounded-xl border bg-white px-3 py-2.5 text-sm leading-relaxed outline-none ${
            forbidden.length > 0 ? "border-[#EF4444]" : "border-[#E8EAF0] focus:border-[#3B4CCA]"
          }`}
        />
        <div className="mt-1 flex items-center justify-between text-xs">
          <span className={preview.headline.length > 20 ? "text-amber-700" : "text-[#6B7394]"}>
            헤드라인 {preview.headline.length}자{preview.headline.length > 20 ? " (20자 초과)" : ""}
          </span>
          <span className="text-[#6B7394]">{copy.length}/500</span>
        </div>
        {forbidden.length > 0 && (
          <div className="mt-2 rounded-lg border border-[#EF4444]/30 bg-[#EF4444]/5 px-3 py-2 text-xs text-[#B91C1C]">
            이 표현은 쓸 수 없습니다: <strong>{forbidden.join(", ")}</strong>
            <div className="mt-0.5 text-xs text-[#6B7394]">리워드는 광고주 예산에서 100% 이전됩니다. 수익·증액을 약속하는 표현은 승인되지 않습니다.</div>
          </div>
        )}
        {brandWarnings.length > 0 && (
          <div className="mt-2 rounded-lg border border-amber-500/30 bg-amber-50 px-3 py-2 text-xs text-amber-800">
            타사 상호가 보입니다: <strong>{brandWarnings.join(", ")}</strong>. 본인 상호가 아니면 승인 단계에서 반려될 수 있습니다.
          </div>
        )}

        {/* 미리보기 */}
        <div className="mt-4 text-xs font-bold text-[#6B7394]">미리보기 (받는 사람이 보는 카드)</div>
        <div className="mt-1 rounded-2xl border border-[#E8EAF0] bg-[#F7F8FC] p-4">
          <div className="text-xs font-bold uppercase tracking-wider text-[#3B4CCA]">다랜드 가입 리워드</div>
          <div className="mt-1 text-lg font-black leading-snug text-[#1A1F36]">{preview.headline || "헤드라인"}</div>
          <div className="mt-1 whitespace-pre-line text-xs leading-relaxed text-[#6B7394]">{preview.body}</div>
          {/* 샘플 표시 — 진짜 버튼이 아니다 */}
          <div
            aria-hidden="true"
            className="pointer-events-none mt-3 scale-95 rounded-xl bg-[#FFB800] py-2.5 text-center text-sm font-bold text-[#1A1F36] opacity-90"
          >
            {rendered.cta}
          </div>
          <div className="mt-2 border-t border-[#E8EAF0] pt-2 text-xs text-[#6B7394]">{honestLine("")}</div>
        </div>
      </section>

      {submitError && (
        <div className="rounded-lg border border-[#EF4444]/30 bg-[#EF4444]/5 px-3 py-2 text-xs text-[#B91C1C]">{submitError}</div>
      )}

      {/* 고정 제출바 — 위에서 뭘 고치는 중에도 "얼마가 잠기는지 / 왜 못 내는지"가 보인다 */}
      <div className="sticky bottom-16 z-40 -mx-5 border-t border-[#E8EAF0] bg-white/95 px-5 py-3 backdrop-blur-md lg:bottom-0 lg:-mx-4 lg:rounded-b-2xl lg:px-4">
        {blockers.length > 0 && <div className="mb-2 text-xs text-[#B91C1C]">{blockers[0]}</div>}
        <div className="grid grid-cols-[1fr_2fr] gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-xl border border-[#E8EAF0] bg-white py-3 text-sm font-bold text-[#6B7394] active:scale-[0.98]"
          >
            돌아가기
          </button>
          <button
            type="button"
            disabled={!canSubmit}
            onClick={() => setConfirmOpen(true)}
            className="rounded-xl bg-[#FFB800] py-3 text-sm font-bold text-[#1A1F36] shadow-lg shadow-[#FFB800]/30 transition-transform hover:bg-[#E5A600] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 disabled:active:scale-100"
          >
            {formatP(headcountValid ? budget : 0)} 잠그고 제출
          </button>
        </div>
      </div>

      {/* 확인 모달 — 모바일 바닥 시트, PC 중앙 */}
      {confirmOpen && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/40 lg:items-center" onClick={() => !submitting && setConfirmOpen(false)}>
          <div
            className="w-full max-w-md rounded-t-2xl bg-white p-5 shadow-xl lg:rounded-2xl"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className="text-base font-bold text-[#1A1F36]">예산 {formatP(budget)}가 잠깁니다</div>
            <p className="mt-2 text-xs leading-relaxed text-[#6B7394]">
              승인 전에는 취소할 수 있고, 거절·종료 시 남은 예산은 잔액으로 돌아옵니다. 잠긴 예산은 출금·지출에 쓸 수 없습니다.
            </p>
            <div className="mt-3 space-y-1 rounded-xl bg-[#F7F8FC] p-3 text-xs text-[#6B7394]">
              <div className="flex justify-between">
                <span>1인당</span>
                <strong className="text-[#1A1F36]">{formatP(unitAmount)}</strong>
              </div>
              <div className="flex justify-between">
                <span>모집 인원</span>
                <strong className="text-[#1A1F36]">{headcount}명</strong>
              </div>
              <div className="flex justify-between">
                <span>채널</span>
                <strong className="text-[#1A1F36]">{channels.map((c) => CHANNEL_LABEL[c]).join(" · ")}</strong>
              </div>
              <div className="flex justify-between border-t border-[#E8EAF0] pt-1">
                <span>제출 후 잔액</span>
                <strong className="text-[#1A1F36]">{formatP(balance - budget)}</strong>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                type="button"
                disabled={submitting}
                onClick={() => setConfirmOpen(false)}
                className="rounded-xl border border-[#E8EAF0] bg-white py-3 text-sm font-bold text-[#6B7394] active:scale-[0.98] disabled:opacity-50"
              >
                다시 볼게요
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={handleConfirm}
                className="rounded-xl bg-[#FFB800] py-3 text-sm font-bold text-[#1A1F36] hover:bg-[#E5A600] active:scale-[0.98] disabled:opacity-50"
              >
                {submitting ? "제출 중..." : "잠그고 제출"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
