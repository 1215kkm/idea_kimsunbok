"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import { isConfigured } from "@/lib/firebase";
import { apiGet, apiPost, ApiClientError } from "@/lib/api-client";
import Navbar from "@/components/Navbar";
import Link from "next/link";

const CARD_COMPANIES = [
  { id: "shinhan", name: "신한카드" },
  { id: "kb", name: "KB국민카드" },
  { id: "samsung", name: "삼성카드" },
  { id: "hyundai", name: "현대카드" },
  { id: "lotte", name: "롯데카드" },
  { id: "hana", name: "하나카드" },
  { id: "bc", name: "BC카드" },
  { id: "woori", name: "우리카드" },
  { id: "nh", name: "NH농협카드" },
];

interface CardStatus {
  connected: boolean;
  cardOrg: string | null;
  lastSyncAt: number | null;
}

export default function CardConnectPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [status, setStatus] = useState<CardStatus | null>(null);
  const [cardOrg, setCardOrg] = useState("");
  const [loginId, setLoginId] = useState("");
  const [loginPw, setLoginPw] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [syncResult, setSyncResult] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) router.push("/");
  }, [user, loading, router]);

  const refreshStatus = useCallback(async () => {
    if (!user || !isConfigured) return;
    try {
      const r = await apiGet<{ ok: boolean } & CardStatus>("/api/card/status");
      setStatus(r);
    } catch {
      // ignore
    }
  }, [user]);

  useEffect(() => {
    refreshStatus();
  }, [refreshStatus]);

  const handleConnect = async () => {
    if (!cardOrg || !loginId || !loginPw) return;
    setBusy(true);
    setError(null);
    try {
      await apiPost("/api/card/connect", { cardOrg, loginId, loginPw });
      setLoginId("");
      setLoginPw("");
      await refreshStatus();
    } catch (err) {
      if (err instanceof ApiClientError) {
        setError(err.message || "카드 연동에 실패했습니다.");
      } else {
        setError("네트워크 오류입니다.");
      }
    } finally {
      setBusy(false);
    }
  };

  const handleSync = async () => {
    setBusy(true);
    setError(null);
    setSyncResult(null);
    try {
      const r = await apiPost<{ imported: number; totalAccumulation: number }>(
        "/api/card/sync",
      );
      setSyncResult(
        `${r.imported}건의 새 결제를 불러와 ${r.totalAccumulation.toLocaleString()}P 적립했습니다.`,
      );
      await refreshStatus();
    } catch (err) {
      if (err instanceof ApiClientError) setError(err.message || "동기화 실패");
      else setError("네트워크 오류입니다.");
    } finally {
      setBusy(false);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm("카드 연동을 해제할까요?")) return;
    setBusy(true);
    try {
      await fetch("/api/card/status", {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${await (
            await import("@/lib/firebase")
          ).auth?.currentUser?.getIdToken()}`,
        },
      });
      await refreshStatus();
    } catch {
      setError("해제 실패");
    } finally {
      setBusy(false);
    }
  };

  if (loading || !user) {
    return <div className="flex min-h-screen items-center justify-center text-[#6B7394]">로딩 중...</div>;
  }

  if (!isConfigured) {
    return (
      <div className="flex min-h-screen items-center justify-center px-6 text-center">
        <div>
          <div className="text-2xl mb-2">💳</div>
          <div className="text-sm text-[#6B7394]">카드 연동은 Firebase 실연동 환경에서만 동작합니다.</div>
        </div>
      </div>
    );
  }

  const connectedName = status?.cardOrg
    ? CARD_COMPANIES.find((c) => c.id === status.cardOrg)?.name || status.cardOrg
    : "";

  return (
    <div className="min-h-screen pb-20">
      <div className="dark-header border-b border-[#E8EAF0] bg-white/95 px-5 py-4 pl-16 pr-16">
        <div className="flex items-center gap-2">
          <Link href="/dashboard" className="text-[#6B7394] hover:text-[#1A1F36]">&larr;</Link>
          <div>
            <h1 className="text-lg font-bold">카드 자동 연동</h1>
            <p className="text-xs dark-text-muted text-[#6B7394]">실제 카드 결제내역 자동 등록</p>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-lg px-5 py-5 space-y-4">
        <div className="rounded-2xl border border-cyan-500/20 p-4 text-xs leading-relaxed text-[#6B7394]"
          style={{ background: "linear-gradient(135deg, rgba(6, 182, 212, 0.08), rgba(168, 85, 247, 0.08))" }}>
          <div className="mb-1 text-sm font-bold text-[#3B4CCA]">자동 연동이란?</div>
          <p>카드사 계정을 연결하면 실제 결제 내역을 자동으로 가져와 지출로 등록합니다. 직접 입력보다 정확하고, 가짜 등록이 불가능합니다.</p>
          <p className="mt-1 text-[11px]">※ 카드사 로그인 정보는 암호화되어 전송되며 다랜드 서버에 저장되지 않습니다.</p>
        </div>

        {error && (
          <div className="rounded-xl border border-[#EF4444]/30 bg-[#EF4444]/5 px-4 py-3 text-xs text-[#EF4444]">
            {error}
          </div>
        )}
        {syncResult && (
          <div className="rounded-xl border border-[#10B981]/30 bg-[#10B981]/5 px-4 py-3 text-xs text-[#10B981]">
            {syncResult}
          </div>
        )}

        {status?.connected ? (
          <div className="rounded-2xl border p-5" style={{ borderColor: "var(--card-border)", background: "var(--card-bg)" }}>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-bold">{connectedName} 연결됨</div>
                <div className="text-xs text-[#6B7394]">
                  마지막 동기화:{" "}
                  {status.lastSyncAt
                    ? new Date(status.lastSyncAt).toLocaleString("ko-KR")
                    : "없음"}
                </div>
              </div>
              <span className="rounded-full bg-[#10B981]/15 px-2 py-0.5 text-[10px] font-bold text-[#10B981]">
                연결됨
              </span>
            </div>
            <button
              onClick={handleSync}
              disabled={busy}
              className="mt-4 w-full rounded-xl bg-gradient-to-r from-cyan-600 to-purple-600 py-3 text-sm font-bold text-white disabled:opacity-50"
            >
              {busy ? "동기화 중..." : "🔄 카드 내역 동기화 (최근 30일)"}
            </button>
            <button
              onClick={handleDisconnect}
              disabled={busy}
              className="mt-2 w-full rounded-xl border border-[#EF4444]/30 py-2.5 text-xs font-bold text-[#EF4444] disabled:opacity-50"
            >
              연동 해제
            </button>
          </div>
        ) : (
          <div className="rounded-2xl border p-5" style={{ borderColor: "var(--card-border)", background: "var(--card-bg)" }}>
            <div className="mb-3 text-sm font-bold text-[#6B7394]">카드사 연결</div>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-[#6B7394] mb-1 block">카드사 선택</label>
                <select
                  value={cardOrg}
                  onChange={(e) => setCardOrg(e.target.value)}
                  className="dark-input w-full rounded-xl border border-[#E8EAF0] bg-white px-4 py-3 text-sm outline-none focus:border-[#3B4CCA]/50"
                >
                  <option value="">선택하세요</option>
                  {CARD_COMPANIES.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-[#6B7394] mb-1 block">카드사 홈페이지 아이디</label>
                <input
                  type="text"
                  value={loginId}
                  onChange={(e) => setLoginId(e.target.value)}
                  autoComplete="off"
                  className="dark-input w-full rounded-xl border border-[#E8EAF0] bg-white px-4 py-3 text-sm placeholder-zinc-400 outline-none focus:border-[#3B4CCA]/50"
                  placeholder="카드사 아이디"
                />
              </div>
              <div>
                <label className="text-xs text-[#6B7394] mb-1 block">비밀번호</label>
                <input
                  type="password"
                  value={loginPw}
                  onChange={(e) => setLoginPw(e.target.value)}
                  autoComplete="off"
                  className="dark-input w-full rounded-xl border border-[#E8EAF0] bg-white px-4 py-3 text-sm placeholder-zinc-400 outline-none focus:border-[#3B4CCA]/50"
                  placeholder="카드사 비밀번호"
                />
              </div>
            </div>
            <button
              onClick={handleConnect}
              disabled={busy || !cardOrg || !loginId || !loginPw}
              className="mt-4 w-full rounded-xl bg-[#FFB800] py-3 text-sm font-bold text-[#1A1F36] disabled:opacity-50"
            >
              {busy ? "연결 중..." : "카드 연결하기"}
            </button>
            <p className="mt-2 text-[10px] text-[#9CA3C1] leading-relaxed">
              입력하신 정보는 CODEF 보안 인증 서버로 RSA 암호화 전송되며, 다랜드는 비밀번호를 저장하지 않습니다.
            </p>
          </div>
        )}
      </div>

      <Navbar />
    </div>
  );
}
