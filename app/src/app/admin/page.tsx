"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import { isConfigured, db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { apiGet, apiPost, ApiClientError } from "@/lib/api-client";
import Navbar from "@/components/Navbar";

interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: string;
  totalPoints: number;
  membershipLevel: number;
  createdAt: number | null;
}

interface AdminWithdrawal {
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

const BANK_NAMES: Record<string, string> = {
  shinhan: "신한은행",
  kb: "국민은행",
  woori: "우리은행",
  hana: "하나은행",
  nh: "농협은행",
  kakao: "카카오뱅크",
  toss: "토스뱅크",
};

type TabType = "overview" | "users" | "withdrawals";
type CheckState = "checking" | "ok" | "denied" | "demo";

export default function AdminPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [tab, setTab] = useState<TabType>("overview");
  const [check, setCheck] = useState<CheckState>("checking");
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [withdrawals, setWithdrawals] = useState<AdminWithdrawal[]>([]);
  const [withdrawalStatus, setWithdrawalStatus] = useState<"pending" | "completed" | "rejected" | "all">("all");
  const [userSearch, setUserSearch] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [splitMode, setSplitMode] = useState<"auto" | "manual">("auto");
  const [splitBusy, setSplitBusy] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/");
      return;
    }
    if (!loading && user) {
      if (!isConfigured) {
        setCheck("demo");
        return;
      }
      if (!db) {
        setCheck("denied");
        return;
      }
      getDoc(doc(db, "users", user.uid))
        .then((snap) => {
          const role = snap.exists() ? snap.data().role : null;
          if (role === "admin") setCheck("ok");
          else setCheck("denied");
        })
        .catch(() => setCheck("denied"));
    }
  }, [user, loading, router]);

  const refreshUsers = useCallback(async () => {
    if (check !== "ok") return;
    try {
      const r = await apiGet<{ items: AdminUser[] }>("/api/admin/users");
      setUsers(r.items || []);
    } catch (err) {
      if (err instanceof ApiClientError) setError(err.code);
    }
  }, [check]);

  const refreshWithdrawals = useCallback(
    async (status: typeof withdrawalStatus = withdrawalStatus) => {
      if (check !== "ok") return;
      try {
        const r = await apiGet<{ items: AdminWithdrawal[] }>(
          `/api/admin/withdraw/list?status=${status}`,
        );
        setWithdrawals(r.items || []);
      } catch (err) {
        if (err instanceof ApiClientError) setError(err.code);
      }
    },
    [check, withdrawalStatus],
  );

  useEffect(() => {
    if (check === "ok") {
      refreshUsers();
      refreshWithdrawals("all");
      apiGet<{ splitMode: "auto" | "manual" }>("/api/admin/settings")
        .then((r) => setSplitMode(r.splitMode))
        .catch(() => { /* 기본 auto 유지 */ });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [check]);

  const handleSplitMode = async (mode: "auto" | "manual") => {
    if (mode === splitMode || splitBusy) return;
    setSplitBusy(true);
    setError(null);
    try {
      await apiPost("/api/admin/settings", { splitMode: mode });
      setSplitMode(mode);
    } catch (err) {
      const msg =
        err instanceof ApiClientError
          ? `분할모드 변경 실패 [${err.code}] ${err.message}`
          : "분할모드 변경 실패";
      setError(msg);
    } finally {
      setSplitBusy(false);
    }
  };

  const handleApprove = async (id: string) => {
    if (!confirm("이 출금 요청을 승인 처리할까요? 외부 송금이 끝났다는 의미입니다.")) return;
    setBusy(true);
    setError(null);
    try {
      await apiPost("/api/admin/withdraw/approve", { requestId: id });
      await refreshWithdrawals();
    } catch (err) {
      const msg =
        err instanceof ApiClientError
          ? `승인 실패 [${err.code}] ${err.message}`
          : `승인 실패: ${(err as Error)?.message || "알 수 없는 오류"}`;
      setError(msg);
      alert(msg);
    } finally {
      setBusy(false);
    }
  };

  const handleReject = async (id: string) => {
    const reason = prompt("반려 사유를 입력해 주세요");
    if (reason === null) return;
    setBusy(true);
    setError(null);
    try {
      await apiPost("/api/admin/withdraw/reject", {
        requestId: id,
        reason,
      });
      await refreshWithdrawals();
    } catch (err) {
      const msg =
        err instanceof ApiClientError
          ? `반려 실패 [${err.code}] ${err.message}`
          : `반려 실패: ${(err as Error)?.message || "알 수 없는 오류"}`;
      setError(msg);
      alert(msg);
    } finally {
      setBusy(false);
    }
  };

  if (loading || check === "checking") {
    return <div className="flex min-h-screen items-center justify-center dark-text-muted">로딩 중...</div>;
  }
  if (check === "demo") {
    return (
      <div className="flex min-h-screen items-center justify-center px-6 text-center">
        <div>
          <div className="text-2xl mb-2">🛡️</div>
          <div className="text-sm text-[#6B7394]">관리자 패널은 Firebase 실연동 환경에서만 동작합니다.</div>
        </div>
      </div>
    );
  }
  if (check === "denied") {
    return (
      <div className="flex min-h-screen items-center justify-center px-6 text-center">
        <div>
          <div className="text-2xl mb-2">🚫</div>
          <div className="text-sm text-[#EF4444]">관리자 권한이 없습니다.</div>
          <button onClick={() => router.push("/dashboard")} className="mt-4 rounded-xl bg-[#3B4CCA] px-4 py-2 text-sm text-white">
            대시보드로 이동
          </button>
        </div>
      </div>
    );
  }

  const filteredUsers = users.filter((u) => {
    if (!userSearch.trim()) return true;
    const q = userSearch.toLowerCase();
    return (
      u.name.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      u.role.toLowerCase().includes(q)
    );
  });

  const totalPointsAcrossUsers = users.reduce((s, u) => s + (u.totalPoints || 0), 0);
  const pendingCount = withdrawals.filter((w) => w.status === "pending").length;
  const pendingAmount = withdrawals
    .filter((w) => w.status === "pending")
    .reduce((s, w) => s + w.amount, 0);

  const tabs: { key: TabType; label: string; icon: string }[] = [
    { key: "overview", label: "총괄", icon: "📊" },
    { key: "users", label: "회원", icon: "👥" },
    { key: "withdrawals", label: "출금", icon: "💸" },
  ];

  return (
    <div className="min-h-screen pb-20">
      <div className="dark-header border-b border-[#E8EAF0] bg-white/95 px-5 py-4 pl-16 pr-16 lg:px-6">
        <div className="flex items-center gap-2">
          <span className="text-xl">🛡️</span>
          <div>
            <h1 className="text-lg font-bold">관리자 패널</h1>
            <p className="text-xs dark-text-muted text-[#6B7394]">다랜드 시스템 관리</p>
          </div>
        </div>
      </div>

      <div className="flex gap-1 border-b px-3 pt-2" style={{ borderColor: "var(--card-border)" }}>
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className="flex items-center gap-1 rounded-t-lg px-3 py-2 text-xs font-bold transition-all"
            style={{
              background: tab === t.key ? "var(--card-bg)" : "transparent",
              color: tab === t.key ? "#a855f7" : "var(--text-muted)",
              borderBottom: tab === t.key ? "2px solid #a855f7" : "2px solid transparent",
            }}
          >
            <span>{t.icon}</span>
            {t.label}
          </button>
        ))}
      </div>

      <div className="mx-auto max-w-lg px-5 py-5">
        {error && (
          <div className="mb-4 rounded-xl border border-[#EF4444]/30 bg-[#EF4444]/5 px-4 py-3 text-xs text-[#EF4444]">
            오류: {error}
          </div>
        )}

        {tab === "overview" && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="dark-card rounded-xl border p-4" style={{ borderColor: "var(--card-border)", background: "var(--card-bg)" }}>
                <div className="text-xs dark-text-muted text-[#6B7394]">총 회원</div>
                <div className="mt-1 text-xl font-black text-[#3B4CCA]">{users.length}명</div>
              </div>
              <div className="dark-card rounded-xl border p-4" style={{ borderColor: "var(--card-border)", background: "var(--card-bg)" }}>
                <div className="text-xs dark-text-muted text-[#6B7394]">총 적립 포인트</div>
                <div className="mt-1 text-xl font-black text-[#10B981]">
                  {totalPointsAcrossUsers.toLocaleString()}P
                </div>
              </div>
              <div className="dark-card rounded-xl border p-4" style={{ borderColor: "var(--card-border)", background: "var(--card-bg)" }}>
                <div className="text-xs dark-text-muted text-[#6B7394]">대기 중인 출금</div>
                <div className="mt-1 text-xl font-black text-amber-500">{pendingCount}건</div>
              </div>
              <div className="dark-card rounded-xl border p-4" style={{ borderColor: "var(--card-border)", background: "var(--card-bg)" }}>
                <div className="text-xs dark-text-muted text-[#6B7394]">대기 출금 합계</div>
                <div className="mt-1 text-xl font-black text-amber-500">{pendingAmount.toLocaleString()}P</div>
              </div>
            </div>

            {/* 분할모드 (의뢰자 확정): 10억P까지 자동, 관리자가 수동 전환 가능 */}
            <div
              className="dark-card rounded-xl border p-4"
              style={{ borderColor: "var(--card-border)", background: "var(--card-bg)" }}
            >
              <div className="mb-1 text-sm font-bold text-[#3B4CCA]">⚙️ 분할모드</div>
              <p className="mb-3 text-xs" style={{ color: "var(--text-muted)" }}>
                소비자단계 <strong>10억P까지 자동</strong> 분할 처리 · 초과 대량 거래는 수동 모드에서 관리자가 직접 관리
              </p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => handleSplitMode("auto")}
                  disabled={splitBusy}
                  className="rounded-lg border py-2.5 text-sm font-bold transition-all disabled:opacity-50"
                  style={{
                    borderColor: splitMode === "auto" ? "rgba(16, 185, 129, 0.5)" : "var(--card-border)",
                    background: splitMode === "auto" ? "rgba(16, 185, 129, 0.1)" : "transparent",
                    color: splitMode === "auto" ? "#10B981" : "var(--text-muted)",
                  }}
                >
                  🤖 자동 모드{splitMode === "auto" ? " (활성)" : ""}
                </button>
                <button
                  onClick={() => handleSplitMode("manual")}
                  disabled={splitBusy}
                  className="rounded-lg border py-2.5 text-sm font-bold transition-all disabled:opacity-50"
                  style={{
                    borderColor: splitMode === "manual" ? "rgba(245, 158, 11, 0.5)" : "var(--card-border)",
                    background: splitMode === "manual" ? "rgba(245, 158, 11, 0.1)" : "transparent",
                    color: splitMode === "manual" ? "#f59e0b" : "var(--text-muted)",
                  }}
                >
                  ✋ 수동 모드{splitMode === "manual" ? " (활성)" : ""}
                </button>
              </div>
            </div>

            <div
              className="dark-card rounded-xl border p-4"
              style={{ borderColor: "var(--card-border)", background: "var(--card-bg)" }}
            >
              <div className="mb-3 text-sm font-bold text-[#3B4CCA]">시스템 상태</div>
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span style={{ color: "var(--text-muted)" }}>Firebase 연동</span>
                  <span className="flex items-center gap-1.5 font-bold text-[#10B981]">
                    <span className="inline-block h-2 w-2 rounded-full bg-[#10B981]" /> 연결됨
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span style={{ color: "var(--text-muted)" }}>비선형공식 엔진</span>
                  <span className="flex items-center gap-1.5 font-bold text-[#10B981]">
                    <span className="inline-block h-2 w-2 rounded-full bg-[#10B981]" /> 정상
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span style={{ color: "var(--text-muted)" }}>출금 승인 플로우</span>
                  <span className="flex items-center gap-1.5 font-bold text-[#10B981]">
                    <span className="inline-block h-2 w-2 rounded-full bg-[#10B981]" /> 활성
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {tab === "users" && (
          <div className="space-y-4">
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[#6B7394]">🔍</span>
              <input
                type="text"
                placeholder="이름, 이메일, 역할 검색"
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                className="dark-input w-full rounded-xl border py-2.5 pl-9 pr-3 text-sm placeholder-zinc-600 outline-none"
                style={{ borderColor: "var(--card-border)", background: "var(--input-bg)" }}
              />
            </div>

            <div className="space-y-2">
              {filteredUsers.length === 0 ? (
                <div className="rounded-xl border border-dashed border-[#E8EAF0] p-6 text-center text-xs text-[#6B7394]">
                  {users.length === 0 ? "회원 데이터가 없습니다." : "검색 결과가 없습니다."}
                </div>
              ) : (
                filteredUsers.map((u) => (
                  <div
                    key={u.id}
                    className="dark-card rounded-xl border p-4"
                    style={{ borderColor: "var(--card-border)", background: "var(--card-bg)" }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#3B4CCA]/15 text-sm font-bold text-[#3B4CCA]">
                          {(u.name || u.email)[0]?.toUpperCase()}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold">{u.name || "(이름 없음)"}</span>
                            <span className="rounded-full px-2 py-0.5 text-[10px] font-bold" style={{ background: "#a855f722", color: "#a855f7" }}>
                              {u.role}
                            </span>
                          </div>
                          <div className="text-xs" style={{ color: "var(--text-muted)" }}>{u.email}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-bold text-[#3B4CCA]">{u.totalPoints.toLocaleString()}P</div>
                        <div className="text-[10px]" style={{ color: "var(--text-muted)" }}>Lv.{u.membershipLevel}</div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {tab === "withdrawals" && (
          <div className="space-y-4">
            <div className="flex gap-2">
              {(["all", "pending", "completed", "rejected"] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => {
                    setWithdrawalStatus(s);
                    refreshWithdrawals(s);
                  }}
                  className="flex-1 rounded-lg py-2 text-xs font-bold transition-all"
                  style={{
                    background: withdrawalStatus === s ? "rgba(168, 85, 247, 0.15)" : "var(--card-bg)",
                    color: withdrawalStatus === s ? "#a855f7" : "var(--text-muted)",
                    border: "1px solid var(--card-border)",
                  }}
                >
                  {s === "pending" ? "대기" : s === "completed" ? "완료" : s === "rejected" ? "반려" : "전체"}
                </button>
              ))}
            </div>

            <div className="space-y-2">
              {withdrawals.length === 0 ? (
                <div className="rounded-xl border border-dashed border-[#E8EAF0] p-6 text-center text-xs text-[#6B7394]">
                  요청이 없습니다.
                </div>
              ) : (
                withdrawals.map((w) => (
                  <div
                    key={w.id}
                    className="dark-card rounded-xl border p-4"
                    style={{ borderColor: "var(--card-border)", background: "var(--card-bg)" }}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="text-sm font-bold">{w.amount.toLocaleString()}P</div>
                        <div className="text-xs text-[#6B7394]">
                          {BANK_NAMES[w.bankInfo?.bank] || w.bankInfo?.bank} ·{" "}
                          {w.bankInfo?.accountNumber} · 예금주 {w.bankInfo?.holder}
                        </div>
                        <div className="text-xs text-[#6B7394]">
                          사용자: {w.userName || "(이름 없음)"}
                          {w.userEmail ? ` · ${w.userEmail}` : ""}
                        </div>
                        <div className="text-xs text-[#6B7394]">
                          {w.requestedAt ? new Date(w.requestedAt).toLocaleString("ko-KR") : ""}
                        </div>
                      </div>
                      <span className="rounded-full px-2 py-0.5 text-[10px] font-bold"
                        style={{
                          background:
                            w.status === "pending" ? "#f59e0b22" : w.status === "completed" ? "#10b98122" : "#EF444422",
                          color:
                            w.status === "pending" ? "#f59e0b" : w.status === "completed" ? "#10b981" : "#EF4444",
                        }}
                      >
                        {w.status === "pending" ? "대기" : w.status === "completed" ? "완료" : "반려"}
                      </span>
                    </div>
                    {w.rejectReason && (
                      <div className="mt-2 text-[11px] text-[#EF4444]">사유: {w.rejectReason}</div>
                    )}
                    {w.status === "pending" && (
                      <div className="mt-3 flex gap-2">
                        <button
                          onClick={() => handleApprove(w.id)}
                          disabled={busy}
                          className="flex-1 rounded-lg bg-[#10B981]/15 py-1.5 text-xs font-bold text-[#10B981] disabled:opacity-50"
                        >
                          승인
                        </button>
                        <button
                          onClick={() => handleReject(w.id)}
                          disabled={busy}
                          className="flex-1 rounded-lg bg-[#EF4444]/15 py-1.5 text-xs font-bold text-[#EF4444] disabled:opacity-50"
                        >
                          반려
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      <Navbar />
    </div>
  );
}
