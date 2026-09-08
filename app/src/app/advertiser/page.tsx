"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import { isConfigured } from "@/lib/firebase";
import { ApiClientError, apiGet, apiPost } from "@/lib/api-client";
import { ADVERTISER_MIN_DEPOSIT, remainingBudget } from "@/lib/reward-ledger";
import {
  cancelCampaign as demoCancelCampaign,
  createCampaign as demoCreateCampaign,
  getBalance as getDemoBalance,
  getCampaignPayouts as getDemoPayouts,
  getCampaigns as getDemoCampaigns,
  getDepositTotal as getDemoDepositTotal,
  getLockedBalance as getDemoLocked,
  type DemoCampaign,
  type DemoRewardError,
} from "@/lib/demo-store";
import CampaignCreateForm from "@/components/reward/CampaignCreateForm";
import CampaignDetail from "@/components/reward/CampaignDetail";
import {
  CHANNEL_LABEL,
  formatDate,
  formatP,
  statusBadge,
  type AdvertiserInfo,
  type CampaignItem,
  type CreateCampaignPayload,
  type PayoutItem,
} from "@/components/reward/types";

type View = { name: "home" } | { name: "create" } | { name: "detail"; id: string };

interface ListResponse {
  ok: boolean;
  items: CampaignItem[];
  advertiser: AdvertiserInfo;
}

function fromDemo(c: DemoCampaign): CampaignItem {
  return {
    id: c.id,
    code: c.code,
    kind: c.kind,
    unitAmount: c.unitAmount,
    headcount: c.headcount,
    budgetLocked: c.budgetLocked,
    budgetPaid: c.budgetPaid,
    budgetRefunded: c.budgetRefunded,
    budgetRemaining: remainingBudget(c),
    paidCount: c.paidCount,
    channels: c.channels,
    copy: c.copy,
    templateId: c.templateId ?? null,
    ownerName: c.ownerName ?? "",
    status: c.status,
    rejectReason: c.rejectReason ?? null,
    createdAt: c.createdAt,
  };
}

const DEMO_ERROR_MESSAGE: Record<DemoRewardError, string> = {
  INSUFFICIENT_BALANCE: "잔액이 부족합니다. 예산만큼 입금 후 다시 제출해 주세요.",
  INSUFFICIENT_QUALIFICATION: `광고주 자격은 입금 누적 ${ADVERTISER_MIN_DEPOSIT.toLocaleString()}P 이상입니다.`,
  FORBIDDEN: "내 캠페인이 아닙니다.",
  NOT_FOUND: "캠페인을 찾을 수 없습니다.",
  ALREADY_REDEEMED: "이미 지급된 회원입니다.",
  SELF_INVITE: "본인 코드는 사용할 수 없습니다.",
  CAMPAIGN_NOT_ACTIVE: "캠페인이 지급 가능 상태가 아닙니다.",
  BUDGET_EXHAUSTED: "캠페인 예산이 소진되었습니다.",
  INVALID_STATE: "처리할 수 없는 상태입니다. 화면을 새로고침해 주세요.",
};

function apiMessage(err: unknown, fallback: string): string {
  if (err instanceof ApiClientError) {
    if (err.code === "INSUFFICIENT_BALANCE") {
      const d = err.details as { required?: number; current?: number } | undefined;
      return d?.required !== undefined && d?.current !== undefined
        ? `잔액이 ${formatP(d.required - d.current)} 부족합니다. 입금 후 다시 제출해 주세요.`
        : err.message;
    }
    return err.message || fallback;
  }
  return "네트워크 오류입니다. 다시 시도해 주세요.";
}

export default function AdvertiserPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const demo = !isConfigured;
  const [view, setView] = useState<View>({ name: "home" });
  const [items, setItems] = useState<CampaignItem[]>([]);
  const [info, setInfo] = useState<AdvertiserInfo | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [payouts, setPayouts] = useState<PayoutItem[]>([]);
  const [payoutsLoading, setPayoutsLoading] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) router.push("/");
  }, [user, loading, router]);

  const load = useCallback(async () => {
    if (!user) return;
    setLoadError(null);
    if (demo) {
      const depositTotal = getDemoDepositTotal(user);
      setItems(getDemoCampaigns(user).map(fromDemo));
      setInfo({
        depositTotal,
        required: ADVERTISER_MIN_DEPOSIT,
        qualified: depositTotal >= ADVERTISER_MIN_DEPOSIT,
        totalPoints: getDemoBalance(user),
        lockedPoints: getDemoLocked(user),
      });
      return;
    }
    try {
      const r = await apiGet<ListResponse>("/api/reward/campaigns");
      setItems(r.items);
      setInfo(r.advertiser);
    } catch (err) {
      console.error("[advertiser] list failed", err);
      setLoadError(apiMessage(err, "캠페인 목록을 불러오지 못했습니다."));
    }
  }, [user, demo]);

  useEffect(() => {
    load();
  }, [load]);

  const loadPayouts = useCallback(
    async (id: string) => {
      setPayoutsLoading(true);
      setPayouts([]);
      if (demo) {
        setPayouts(getDemoPayouts(id));
        setPayoutsLoading(false);
        return;
      }
      try {
        const r = await apiGet<{ ok: boolean; items: PayoutItem[] }>(`/api/reward/campaigns/${encodeURIComponent(id)}/payouts`);
        setPayouts(r.items);
      } catch (err) {
        console.error("[advertiser] payouts failed", err);
      } finally {
        setPayoutsLoading(false);
      }
    },
    [demo],
  );

  const openDetail = (id: string) => {
    setView({ name: "detail", id });
    loadPayouts(id);
    if (typeof window !== "undefined") window.scrollTo({ top: 0 });
  };

  const submitCampaign = async (payload: CreateCampaignPayload): Promise<string | null> => {
    if (!user) return "로그인이 필요합니다.";
    if (demo) {
      const r = demoCreateCampaign(user, { ...payload, kind: payload.kind });
      if (!r.ok) return DEMO_ERROR_MESSAGE[r.error];
      await load();
      setFlash(`캠페인 ${r.campaign.code} 제출 완료 — 예산 ${formatP(r.campaign.budgetLocked)} 잠김 (데모: 관리자 승인 후 지급)`);
      openDetail(r.campaign.id);
      return null;
    }
    try {
      const r = await apiPost<{ ok: boolean; id: string; code: string; budgetLocked: number }>("/api/reward/campaigns", payload);
      await load();
      setFlash(`캠페인 ${r.code} 제출 완료 — 예산 ${formatP(r.budgetLocked)} 잠김. 관리자 승인 후 지급이 시작됩니다.`);
      openDetail(r.id);
      return null;
    } catch (err) {
      console.error("[advertiser] create failed", err);
      return apiMessage(err, "캠페인 제출에 실패했습니다.");
    }
  };

  const cancelCampaign = async (id: string): Promise<string | null> => {
    if (!user) return "로그인이 필요합니다.";
    if (demo) {
      const r = demoCancelCampaign(user, id);
      if (!r.ok) return DEMO_ERROR_MESSAGE[r.error];
      await load();
      setFlash(`캠페인 취소 — ${formatP(r.refunded)} 반환됨`);
      return null;
    }
    try {
      const r = await apiPost<{ ok: boolean; refunded: number }>(`/api/reward/campaigns/${encodeURIComponent(id)}/cancel`);
      await load();
      setFlash(`캠페인 취소 — ${formatP(r.refunded)} 반환됨`);
      return null;
    } catch (err) {
      console.error("[advertiser] cancel failed", err);
      return apiMessage(err, "취소에 실패했습니다.");
    }
  };

  if (loading || !user) {
    return <div className="flex min-h-screen items-center justify-center text-[#6B7394]">로딩 중...</div>;
  }

  const balance = info?.totalPoints ?? 0;
  const locked = info?.lockedPoints ?? 0;
  const qualified = info?.qualified ?? false;
  const activeCount = items.filter((c) => c.status === "live" || c.status === "approved").length;
  const detail = view.name === "detail" ? items.find((c) => c.id === view.id) ?? null : null;

  const qualificationCard = (
    <div
      className={`rounded-2xl border p-4 ${qualified ? "border-[#10B981]/30 bg-[#10B981]/5" : "border-amber-500/30 bg-amber-50"}`}
    >
      <div className="flex items-center justify-between">
        <div className="text-xs font-bold text-[#1A1F36]">광고주 자격</div>
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${qualified ? "bg-[#10B981] text-white" : "bg-amber-500 text-white"}`}>
          {qualified ? "자격 있음" : "미달"}
        </span>
      </div>
      <div className="mt-1 text-xs text-[#6B7394]">
        입금 누적 <strong className="text-[#1A1F36]">{formatP(info?.depositTotal ?? 0)}</strong> / 기준 {formatP(ADVERTISER_MIN_DEPOSIT)}
      </div>
      {!qualified && (
        <Link href="/deposit" className="mt-2 block rounded-lg bg-[#FFB800] py-2 text-center text-xs font-bold text-[#1A1F36] hover:bg-[#E5A600]">
          {formatP(Math.max(0, ADVERTISER_MIN_DEPOSIT - (info?.depositTotal ?? 0)))} 더 입금하면 자격이 생깁니다 →
        </Link>
      )}
    </div>
  );

  const balanceCard = (
    <div className="rounded-2xl border border-[#E8EAF0] bg-white p-4 dark-card">
      <div className="text-[10px] text-[#6B7394]">사용 가능 잔액</div>
      <div className="text-2xl font-black text-[#3B4CCA]">{formatP(balance)}</div>
      <div className="mt-2 flex items-center justify-between border-t border-[#E8EAF0] pt-2 text-xs">
        <span className="text-[#6B7394]">캠페인에 잠긴 예산</span>
        <strong className="text-[#1A1F36]">{formatP(locked)}</strong>
      </div>
      <div className="mt-1 text-[10px] leading-relaxed text-[#9CA3C1]">잠긴 예산은 출금·지출에 쓸 수 없고, 거절·종료 시 남은 만큼 잔액으로 돌아옵니다.</div>
    </div>
  );

  const honestCard = (
    <div className="rounded-2xl border border-[#E8EAF0] bg-white p-4 text-xs leading-relaxed text-[#6B7394] dark-card">
      <div className="mb-1 text-sm font-bold text-[#1A1F36]">리워드광고는 회원을 사는 상품입니다</div>
      <p>
        캠페인에 넣은 예산은 가입한 회원의 것이 됩니다. 광고주에게 되돌아오는 포인트는 <strong className="text-[#1A1F36]">0</strong>, 얻는 것은{" "}
        <strong className="text-[#1A1F36]">회원 N명</strong>입니다.
      </p>
      <ul className="mt-2 space-y-1">
        <li>• 1인당 단가·인원은 광고주가 정하고, 제출 즉시 잠깁니다.</li>
        <li>• 가입 + 이메일 인증을 마친 회원에게만 1인 1회 지급됩니다.</li>
        <li>• 가입이 없으면 0원. 남은 예산은 종료 시 전액 반환됩니다.</li>
      </ul>
    </div>
  );

  return (
    <div className="min-h-screen pb-20">
      <div className="dark-header border-b border-[#E8EAF0] bg-white/95 px-5 py-4 pl-16 pr-16 lg:px-6">
        <div className="flex items-center gap-2">
          <Link href="/dashboard" className="text-[#6B7394] hover:text-[#1A1F36]">
            &larr;
          </Link>
          <div>
            <h1 className="text-lg font-bold">리워드광고</h1>
            <p className="text-xs dark-text-muted text-[#6B7394]">내 예산으로 가입 회원에게 1인당 정액 지급</p>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-lg px-5 py-5 lg:max-w-5xl lg:grid lg:grid-cols-[1fr_320px] lg:gap-6 lg:items-start">
        {/* ===== 메인 컬럼 ===== */}
        <div className="space-y-4">
          {demo && (
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-xs text-[#6B7394]">
              <span className="font-bold text-amber-700">데모 모드</span> — 캠페인·잠금·지급은 이 브라우저 안에서만 시뮬레이션됩니다. 자격은 데모 입금 누적으로 판단합니다.
            </div>
          )}
          {loadError && (
            <div className="rounded-xl border border-[#EF4444]/30 bg-[#EF4444]/5 px-4 py-3 text-xs text-[#B91C1C]">
              {loadError}{" "}
              <button type="button" onClick={load} className="underline">
                다시 시도
              </button>
            </div>
          )}
          {flash && (
            <div className="flex items-start justify-between gap-2 rounded-xl border border-[#10B981]/30 bg-[#10B981]/5 px-4 py-3 text-xs text-[#047857]">
              <span>{flash}</span>
              <button type="button" onClick={() => setFlash(null)} className="shrink-0 text-[#6B7394]">
                ✕
              </button>
            </div>
          )}

          {view.name === "create" && (
            <CampaignCreateForm
              balance={balance}
              qualified={qualified}
              defaultOwnerName={user.displayName || ""}
              onSubmit={submitCampaign}
              onCancel={() => setView({ name: "home" })}
            />
          )}

          {view.name === "detail" &&
            (detail ? (
              <CampaignDetail campaign={detail} payouts={payouts} payoutsLoading={payoutsLoading} onCancel={cancelCampaign} onBack={() => setView({ name: "home" })} />
            ) : (
              <div className="rounded-2xl border border-[#E8EAF0] bg-white p-6 text-center text-xs text-[#6B7394]">
                캠페인을 찾을 수 없습니다.{" "}
                <button type="button" onClick={() => setView({ name: "home" })} className="text-[#3B4CCA] underline">
                  목록으로
                </button>
              </div>
            ))}

          {view.name === "home" && (
            <>
              {/* 모바일: 자격·잔액 (PC는 우측 패널) */}
              <div className="space-y-3 lg:hidden">
                {qualificationCard}
                {balanceCard}
              </div>

              <button
                type="button"
                onClick={() => setView({ name: "create" })}
                className="w-full rounded-2xl bg-[#FFB800] py-4 text-base font-bold text-[#1A1F36] shadow-lg shadow-[#FFB800]/30 transition-transform hover:scale-[1.01] hover:bg-[#E5A600]"
              >
                캠페인 만들기
              </button>
              {!qualified && (
                <p className="-mt-2 text-center text-[11px] text-[#6B7394]">자격이 생기기 전에도 문구·예산을 미리 구성해 볼 수 있습니다 (제출은 자격 후).</p>
              )}

              <section>
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#3B4CCA]">내 캠페인</h3>
                  <span className="text-[11px] text-[#6B7394]">
                    진행 중 {activeCount} · 전체 {items.length}
                  </span>
                </div>
                {items.length === 0 ? (
                  <div className="rounded-2xl border border-[#E8EAF0] bg-white p-8 text-center text-sm text-[#6B7394] dark-card">
                    아직 캠페인이 없습니다.
                    <div className="mt-1 text-xs text-[#9CA3C1]">첫 캠페인 권장: 1만P × 10명 = 10만P (최대 손실 10만원, 안 오면 그만큼 반환)</div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {items.map((c) => {
                      const badge = statusBadge(c);
                      const headline = c.copy.split("\n")[0];
                      return (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => openDetail(c.id)}
                          className="w-full rounded-xl border border-[#E8EAF0] bg-white p-4 text-left transition-colors hover:border-[#3B4CCA]/40 dark-card"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <div className="truncate text-sm font-bold text-[#1A1F36]">{headline}</div>
                              <div className="mt-0.5 text-[11px] text-[#6B7394]">
                                {c.code} · {formatDate(c.createdAt)} · {c.channels.map((ch) => CHANNEL_LABEL[ch]).join("·")}
                              </div>
                            </div>
                            <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold ${badge.className}`}>{badge.label}</span>
                          </div>
                          <div className="mt-2 flex items-center justify-between text-xs">
                            <span className="text-[#6B7394]">
                              {formatP(c.unitAmount)} × {c.headcount}명
                            </span>
                            <span className="text-[#6B7394]">
                              지급 <strong className="text-[#1A1F36]">{formatP(c.budgetPaid)}</strong> · 잔여{" "}
                              <strong className="text-[#3B4CCA]">
                                {formatP(c.status === "ended" || c.status === "rejected" ? 0 : c.budgetRemaining)}
                              </strong>
                            </span>
                          </div>
                          {c.status === "pending_review" && (
                            <div className="mt-2 text-[11px] text-amber-700">승인 대기 — 상세에서 취소할 수 있습니다</div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </section>

              <div className="lg:hidden">{honestCard}</div>
            </>
          )}
        </div>
        {/* ===== /메인 컬럼 ===== */}

        {/* ===== 우측 정보 패널 (PC 전용) ===== */}
        <aside className="mt-5 hidden flex-col gap-4 lg:mt-0 lg:flex lg:sticky lg:top-[4.5rem]">
          {qualificationCard}
          {balanceCard}
          {honestCard}
        </aside>
      </div>

      <Navbar />
    </div>
  );
}
