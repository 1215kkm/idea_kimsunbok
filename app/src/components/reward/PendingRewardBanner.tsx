"use client";

import { useEffect, useState } from "react";
import { sendEmailVerification } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { ApiClientError, apiGet, apiPost } from "@/lib/api-client";

const RESEND_COOLDOWN_SEC = 60;

interface Props {
  code: string;
  /** 지급 성공 → 대시보드가 잔액을 갱신하고 배너를 내린다 */
  onPaid: (amount: number, newBalance: number) => void;
  /** 코드가 더 이상 청구될 수 없어 서버가 정리한 경우 (배너 내림) */
  onCleared: () => void;
}

/**
 * 가입 때 이메일 미인증으로 보류된 리워드 (users.pendingRewardCode) — 대시보드 상단 "지급 대기" 배너.
 * 인증 전: 금액 안내 + [인증 메일 재발송](60초 쿨다운) / 인증 후: [리워드 받기] → POST /api/reward/redeem
 * emailVerified 는 클라이언트 User 와 ID 토큰 양쪽이 낡을 수 있으므로 reload() + getIdToken(true) 를 거친다.
 */
export default function PendingRewardBanner({ code, onPaid, onCleared }: Props) {
  const [amount, setAmount] = useState<number | null>(null);
  const [inactive, setInactive] = useState(false);
  const [verified, setVerified] = useState<boolean>(auth?.currentUser?.emailVerified ?? false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ kind: "info" | "error"; text: string } | null>(null);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    let cancelled = false;
    apiGet<{ ok: boolean; amount: number }>(`/api/invite/info?code=${encodeURIComponent(code)}`)
      .then((r) => {
        if (!cancelled) setAmount(r.amount);
      })
      .catch((err) => {
        if (cancelled) return;
        if (err instanceof ApiClientError && (err.code === "INACTIVE" || err.code === "NOT_FOUND")) setInactive(true);
        else console.error("[reward] pending code info failed", err);
      });
    return () => {
      cancelled = true;
    };
  }, [code]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = window.setTimeout(() => setCooldown((s) => s - 1), 1000);
    return () => window.clearTimeout(t);
  }, [cooldown]);

  const resend = async () => {
    const u = auth?.currentUser;
    if (!u) return;
    setBusy(true);
    setMessage(null);
    try {
      await sendEmailVerification(u);
      setCooldown(RESEND_COOLDOWN_SEC);
      setMessage({ kind: "info", text: `${u.email} 로 인증 메일을 다시 보냈습니다. 스팸함도 확인해 주세요.` });
    } catch (err) {
      const c = (err as { code?: string })?.code || "";
      console.error("[reward] sendEmailVerification failed", err);
      setMessage({
        kind: "error",
        text: c === "auth/too-many-requests" ? "요청이 너무 많습니다. 잠시 후 다시 시도해 주세요." : "인증 메일 발송에 실패했습니다.",
      });
    } finally {
      setBusy(false);
    }
  };

  const claim = async () => {
    const u = auth?.currentUser;
    if (!u) return;
    setBusy(true);
    setMessage(null);
    try {
      await u.reload();
      if (!u.emailVerified) {
        setVerified(false);
        setMessage({ kind: "info", text: "아직 인증이 확인되지 않았습니다. 메일의 링크를 누른 뒤 다시 눌러 주세요." });
        return;
      }
      setVerified(true);
      await u.getIdToken(true); // email_verified 클레임을 새 토큰에 반영
      const r = await apiPost<{ ok: boolean; amount: number; newBalance: number }>("/api/reward/redeem", { code });
      onPaid(r.amount, r.newBalance);
    } catch (err) {
      if (err instanceof ApiClientError) {
        if (err.code === "ALREADY_REDEEMED" || err.code === "NOT_FOUND" || err.code === "SELF_INVITE" || err.code === "BUDGET_EXHAUSTED") {
          // 서버가 pendingRewardCode 를 지웠다 — 배너를 내리되 이유는 보여준다
          onCleared();
          return;
        }
        if (err.code === "EMAIL_NOT_VERIFIED") {
          setMessage({ kind: "info", text: "인증 정보가 아직 반영되지 않았습니다. 잠시 후 다시 눌러 주세요." });
        } else if (err.code === "DAILY_CAP_REACHED") {
          setMessage({ kind: "info", text: "오늘 이 캠페인의 지급 한도에 도달했습니다. 내일 다시 받을 수 있습니다." });
        } else if (err.code === "CAMPAIGN_NOT_ACTIVE") {
          setMessage({ kind: "info", text: "캠페인이 잠시 중단된 상태입니다. 재개되면 다시 받을 수 있습니다." });
        } else {
          setMessage({ kind: "error", text: err.message || "지급 요청에 실패했습니다." });
        }
      } else {
        console.error("[reward] redeem failed", err);
        setMessage({ kind: "error", text: "네트워크 오류입니다. 다시 시도해 주세요." });
      }
    } finally {
      setBusy(false);
    }
  };

  const amountText = amount !== null ? `${amount.toLocaleString()}P` : "가입 리워드";

  return (
    <div className="mx-5 mt-3 rounded-2xl border border-[#3B4CCA]/25 bg-[#3B4CCA]/5 p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-wider text-[#3B4CCA]">지급 대기</div>
          <div className="mt-0.5 text-sm font-bold text-[#1A1F36]">
            {inactive
              ? "이 가입 코드는 현재 지급이 중단되었습니다"
              : verified
                ? `${amountText}를 받을 수 있습니다`
                : `이메일 인증을 마치면 ${amountText}가 지급됩니다`}
          </div>
          <div className="mt-0.5 text-[11px] text-[#6B7394]">
            광고주 예산에서 지급 · 1P = 1원 · 1인 1회 · 코드 {code}
          </div>
        </div>
      </div>
      {!inactive && (
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button
            type="button"
            disabled={busy || cooldown > 0}
            onClick={resend}
            className="rounded-xl border border-[#E8EAF0] bg-white py-2.5 text-xs font-bold text-[#6B7394] disabled:opacity-50"
          >
            {cooldown > 0 ? `재발송 (${cooldown}초)` : "인증 메일 재발송"}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={claim}
            className="rounded-xl bg-[#FFB800] py-2.5 text-xs font-bold text-[#1A1F36] hover:bg-[#E5A600] disabled:opacity-50"
          >
            {busy ? "확인 중..." : verified ? "리워드 받기" : "인증했어요 → 리워드 받기"}
          </button>
        </div>
      )}
      {message && (
        <div
          className={`mt-2 rounded-lg px-3 py-2 text-[11px] leading-relaxed ${
            message.kind === "error" ? "border border-[#EF4444]/30 bg-[#EF4444]/5 text-[#B91C1C]" : "border border-[#3B4CCA]/20 bg-white text-[#3B4CCA]"
          }`}
        >
          {message.text}
        </div>
      )}
    </div>
  );
}
