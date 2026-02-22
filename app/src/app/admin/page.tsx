"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { isConfigured } from "@/lib/firebase";
import Navbar from "@/components/Navbar";

// 데모 데이터
const DEMO_STORES = [
  { id: "super", name: "행복한 슈퍼", category: "마트", icon: "🏪", owner: "박민수", sales: 2450000, status: "active" },
  { id: "cafe", name: "다랜드 카페", category: "카페", icon: "☕", owner: "김철수", sales: 980000, status: "active" },
  { id: "gas", name: "주유소", category: "주유", icon: "⛽", owner: "이영호", sales: 5600000, status: "active" },
  { id: "pharm", name: "건강 약국", category: "약국", icon: "💊", owner: "최지연", sales: 640000, status: "active" },
  { id: "rest", name: "맛있는 식당", category: "식당", icon: "🍽️", owner: "한동우", sales: 1870000, status: "active" },
  { id: "beauty", name: "뷰티샵", category: "미용", icon: "💇", owner: "정수현", sales: 720000, status: "pending" },
];

const DEMO_USERS = [
  { id: "u1", name: "박영희", email: "younghee@test.com", role: "consumer", points: 128400, txCount: 23, joined: "2025-01-15" },
  { id: "u2", name: "이지은", email: "jieun@test.com", role: "consumer", points: 85200, txCount: 15, joined: "2025-02-03" },
  { id: "u3", name: "김철수", email: "chulsu@test.com", role: "store", points: 340000, txCount: 45, joined: "2025-01-10" },
  { id: "u4", name: "홍길동", email: "hong@test.com", role: "consumer", points: 42000, txCount: 8, joined: "2025-03-22" },
  { id: "u5", name: "신한은행", email: "shinhan@test.com", role: "advertiser", points: 0, txCount: 0, joined: "2025-04-01" },
  { id: "u6", name: "박민수", email: "minsu@test.com", role: "store", points: 210000, txCount: 67, joined: "2025-01-08" },
];

const DEMO_RECENT_TX = [
  { id: "t1", user: "박영희", store: "다랜드 카페", amount: 4500, earned: 5400, time: "10분 전" },
  { id: "t2", user: "이지은", store: "건강 약국", amount: 8000, earned: 9600, time: "25분 전" },
  { id: "t3", user: "홍길동", store: "행복한 슈퍼", amount: 32000, earned: 38400, time: "1시간 전" },
  { id: "t4", user: "박영희", store: "주유소", amount: 70000, earned: 84000, time: "2시간 전" },
  { id: "t5", user: "이지은", store: "맛있는 식당", amount: 25000, earned: 30000, time: "3시간 전" },
];

type TabType = "overview" | "stores" | "users" | "transactions";

export default function AdminPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [tab, setTab] = useState<TabType>("overview");
  const [storeSearch, setStoreSearch] = useState("");
  const [userSearch, setUserSearch] = useState("");

  useEffect(() => {
    if (!loading && !user) router.push("/");
  }, [user, loading, router]);

  if (loading || !user) {
    return <div className="flex min-h-screen items-center justify-center dark-text-muted">로딩 중...</div>;
  }

  const totalSales = DEMO_STORES.reduce((s, st) => s + st.sales, 0);
  const totalUsers = DEMO_USERS.length;
  const totalStores = DEMO_STORES.filter((s) => s.status === "active").length;
  const totalPool = Math.round(totalSales * 0.3);

  const tabs: { key: TabType; label: string; icon: string }[] = [
    { key: "overview", label: "총괄", icon: "📊" },
    { key: "stores", label: "사용자", icon: "🏪" },
    { key: "users", label: "회원", icon: "👥" },
    { key: "transactions", label: "거래", icon: "💳" },
  ];

  const filteredStores = DEMO_STORES.filter((s) => {
    if (!storeSearch.trim()) return true;
    const q = storeSearch.toLowerCase();
    return s.name.toLowerCase().includes(q) || s.owner.toLowerCase().includes(q) || s.category.toLowerCase().includes(q);
  });

  const filteredUsers = DEMO_USERS.filter((u) => {
    if (!userSearch.trim()) return true;
    const q = userSearch.toLowerCase();
    return u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q) || u.role.toLowerCase().includes(q);
  });

  const roleLabel = (role: string) => {
    switch (role) {
      case "consumer": return { text: "소비자", color: "#06b6d4" };
      case "store": return { text: "사용자(사업주)", color: "#f59e0b" };
      case "advertiser": return { text: "광고주", color: "#a855f7" };
      default: return { text: role, color: "#71717a" };
    }
  };

  return (
    <div className="min-h-screen pb-20">
      {/* 헤더 */}
      <div className="dark-header border-b border-purple-900/20 bg-[#0d0d30]/80 px-5 py-4 pl-16">
        <div className="flex items-center gap-2">
          <span className="text-xl">🛡️</span>
          <div>
            <h1 className="text-lg font-bold">관리자 패널</h1>
            <p className="text-xs dark-text-muted text-zinc-500">다랜드 시스템 관리</p>
          </div>
        </div>
      </div>

      {/* 탭 바 */}
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

        {/* ========== 총괄 탭 ========== */}
        {tab === "overview" && (
          <div className="space-y-4">
            {/* 핵심 지표 */}
            <div className="grid grid-cols-2 gap-3">
              <div className="dark-card rounded-xl border p-4" style={{ borderColor: "var(--card-border)", background: "var(--card-bg)" }}>
                <div className="text-xs dark-text-muted text-zinc-500">총 매출</div>
                <div className="mt-1 text-xl font-black text-emerald-400">{totalSales.toLocaleString()}원</div>
              </div>
              <div className="dark-card rounded-xl border p-4" style={{ borderColor: "var(--card-border)", background: "var(--card-bg)" }}>
                <div className="text-xs dark-text-muted text-zinc-500">총 회원</div>
                <div className="mt-1 text-xl font-black text-cyan-400">{totalUsers}명</div>
              </div>
              <div className="dark-card rounded-xl border p-4" style={{ borderColor: "var(--card-border)", background: "var(--card-bg)" }}>
                <div className="text-xs dark-text-muted text-zinc-500">활성 사용자</div>
                <div className="mt-1 text-xl font-black text-amber-400">{totalStores}개</div>
              </div>
              <div className="dark-card rounded-xl border p-4" style={{ borderColor: "var(--card-border)", background: "var(--card-bg)" }}>
                <div className="text-xs dark-text-muted text-zinc-500">멤버십 풀</div>
                <div className="mt-1 text-xl font-black text-purple-400">{totalPool.toLocaleString()}P</div>
              </div>
            </div>

            {/* 시스템 상태 */}
            <div
              className="dark-card rounded-xl border p-4"
              style={{ borderColor: "var(--card-border)", background: "var(--card-bg)" }}
            >
              <div className="mb-3 text-sm font-bold text-purple-400">시스템 상태</div>
              <div className="space-y-2">
                {[
                  { label: "비선형공식 엔진", status: "정상", color: "#10b981" },
                  { label: "보정 모드", status: "활성 (120%)", color: "#10b981" },
                  { label: "결제 시스템", status: "데모 모드", color: "#f59e0b" },
                  { label: "Firebase 연동", status: isConfigured ? "연결됨" : "미설정", color: isConfigured ? "#10b981" : "#f59e0b" },
                ].map((item) => (
                  <div key={item.label} className="flex items-center justify-between text-sm">
                    <span style={{ color: "var(--text-muted)" }}>{item.label}</span>
                    <span className="flex items-center gap-1.5 font-bold" style={{ color: item.color }}>
                      <span className="inline-block h-2 w-2 rounded-full" style={{ background: item.color }} />
                      {item.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* 최근 거래 */}
            <div>
              <div className="mb-2 text-xs font-bold uppercase tracking-wider text-purple-400">실시간 거래</div>
              <div className="space-y-2">
                {DEMO_RECENT_TX.map((tx) => (
                  <div
                    key={tx.id}
                    className="dark-card flex items-center justify-between rounded-xl border px-3 py-2.5"
                    style={{ borderColor: "var(--card-border)", background: "var(--card-bg)" }}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 text-sm">
                        <span className="font-bold">{tx.user}</span>
                        <span style={{ color: "var(--text-muted)" }}>→</span>
                        <span className="truncate" style={{ color: "var(--text-muted)" }}>{tx.store}</span>
                      </div>
                      <div className="text-xs" style={{ color: "var(--text-sub)" }}>{tx.time}</div>
                    </div>
                    <div className="ml-2 text-right shrink-0">
                      <div className="text-sm font-bold text-rose-400">-{tx.amount.toLocaleString()}원</div>
                      <div className="text-xs font-bold text-emerald-400">+{tx.earned.toLocaleString()}P</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ========== 사용자 관리 탭 ========== */}
        {tab === "stores" && (
          <div className="space-y-4">
            {/* 검색 + 추가 버튼 */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-zinc-500">🔍</span>
                <input
                  type="text"
                  placeholder="사용자/회원 이름 검색"
                  value={storeSearch}
                  onChange={(e) => setStoreSearch(e.target.value)}
                  className="dark-input w-full rounded-xl border py-2.5 pl-9 pr-3 text-sm placeholder-zinc-600 outline-none"
                  style={{ borderColor: "var(--card-border)", background: "var(--input-bg)" }}
                />
              </div>
              <button className="shrink-0 rounded-xl bg-gradient-to-r from-purple-600 to-cyan-500 px-4 text-sm font-bold text-white">
                + 추가
              </button>
            </div>

            {/* 사용자 리스트 */}
            <div className="space-y-2">
              {filteredStores.map((store) => (
                <div
                  key={store.id}
                  className="dark-card rounded-xl border p-4"
                  style={{ borderColor: "var(--card-border)", background: "var(--card-bg)" }}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{store.icon}</span>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold">{store.name}</span>
                          <span
                            className="rounded-full px-2 py-0.5 text-[10px] font-bold"
                            style={{
                              background: store.status === "active" ? "rgba(16,185,129,0.15)" : "rgba(245,158,11,0.15)",
                              color: store.status === "active" ? "#10b981" : "#f59e0b",
                            }}
                          >
                            {store.status === "active" ? "활성" : "대기"}
                          </span>
                        </div>
                        <div className="text-xs" style={{ color: "var(--text-muted)" }}>
                          {store.category} · {store.owner} 회원
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold text-cyan-400">{store.sales.toLocaleString()}원</div>
                      <div className="text-[10px]" style={{ color: "var(--text-muted)" }}>누적 매출</div>
                    </div>
                  </div>
                  <div className="mt-3 flex gap-2">
                    <button className="flex-1 rounded-lg py-1.5 text-xs font-bold" style={{ background: "rgba(168,85,247,0.1)", color: "#a855f7" }}>
                      상세보기
                    </button>
                    <button className="flex-1 rounded-lg py-1.5 text-xs font-bold" style={{ background: "rgba(16,185,129,0.1)", color: "#10b981" }}>
                      정산
                    </button>
                    {store.status === "pending" && (
                      <button className="flex-1 rounded-lg py-1.5 text-xs font-bold" style={{ background: "rgba(245,158,11,0.1)", color: "#f59e0b" }}>
                        승인
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ========== 회원 관리 탭 ========== */}
        {tab === "users" && (
          <div className="space-y-4">
            {/* 요약 */}
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: "소비자", count: DEMO_USERS.filter((u) => u.role === "consumer").length, color: "#06b6d4" },
                { label: "사용자", count: DEMO_USERS.filter((u) => u.role === "store").length, color: "#f59e0b" },
                { label: "광고주", count: DEMO_USERS.filter((u) => u.role === "advertiser").length, color: "#a855f7" },
              ].map((r) => (
                <div
                  key={r.label}
                  className="dark-card rounded-xl border p-3 text-center"
                  style={{ borderColor: "var(--card-border)", background: "var(--card-bg)" }}
                >
                  <div className="text-xs" style={{ color: "var(--text-muted)" }}>{r.label}</div>
                  <div className="text-lg font-black" style={{ color: r.color }}>{r.count}명</div>
                </div>
              ))}
            </div>

            {/* 검색 */}
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-zinc-500">🔍</span>
              <input
                type="text"
                placeholder="이름, 이메일, 역할 검색"
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                className="dark-input w-full rounded-xl border py-2.5 pl-9 pr-3 text-sm placeholder-zinc-600 outline-none"
                style={{ borderColor: "var(--card-border)", background: "var(--input-bg)" }}
              />
            </div>

            {/* 회원 리스트 */}
            <div className="space-y-2">
              {filteredUsers.map((u) => {
                const rl = roleLabel(u.role);
                return (
                  <div
                    key={u.id}
                    className="dark-card rounded-xl border p-4"
                    style={{ borderColor: "var(--card-border)", background: "var(--card-bg)" }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className="flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold"
                          style={{ background: `${rl.color}22`, color: rl.color }}
                        >
                          {u.name.charAt(0)}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold">{u.name}</span>
                            <span
                              className="rounded-full px-2 py-0.5 text-[10px] font-bold"
                              style={{ background: `${rl.color}22`, color: rl.color }}
                            >
                              {rl.text}
                            </span>
                          </div>
                          <div className="text-xs" style={{ color: "var(--text-muted)" }}>{u.email}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-bold text-cyan-400">{u.points.toLocaleString()}P</div>
                        <div className="text-[10px]" style={{ color: "var(--text-muted)" }}>{u.txCount}건 거래</div>
                      </div>
                    </div>
                    <div className="mt-2 flex items-center justify-between text-xs" style={{ color: "var(--text-sub)" }}>
                      <span>가입일: {u.joined}</span>
                      <button className="font-bold text-purple-400">상세보기</button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ========== 거래 모니터링 탭 ========== */}
        {tab === "transactions" && (
          <div className="space-y-4">
            {/* 오늘 거래 요약 */}
            <div
              className="dark-card rounded-xl border p-4"
              style={{ borderColor: "var(--card-border)", background: "linear-gradient(135deg, var(--accent-gradient-from), var(--accent-gradient-to))" }}
            >
              <div className="text-xs dark-text-muted text-zinc-500">오늘 거래 현황</div>
              <div className="mt-2 grid grid-cols-3 gap-3">
                <div className="text-center">
                  <div className="text-xl font-black text-cyan-400">{DEMO_RECENT_TX.length}건</div>
                  <div className="text-[10px]" style={{ color: "var(--text-muted)" }}>거래 수</div>
                </div>
                <div className="text-center">
                  <div className="text-xl font-black text-rose-400">
                    {DEMO_RECENT_TX.reduce((s, t) => s + t.amount, 0).toLocaleString()}원
                  </div>
                  <div className="text-[10px]" style={{ color: "var(--text-muted)" }}>결제 금액</div>
                </div>
                <div className="text-center">
                  <div className="text-xl font-black text-emerald-400">
                    {DEMO_RECENT_TX.reduce((s, t) => s + t.earned, 0).toLocaleString()}P
                  </div>
                  <div className="text-[10px]" style={{ color: "var(--text-muted)" }}>적립 포인트</div>
                </div>
              </div>
            </div>

            {/* 전체 거래 리스트 */}
            <div className="space-y-2">
              {DEMO_RECENT_TX.map((tx) => (
                <div
                  key={tx.id}
                  className="dark-card rounded-xl border p-3"
                  style={{ borderColor: "var(--card-border)", background: "var(--card-bg)" }}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm">
                        <span className="font-bold">{tx.user}</span>
                        <span className="mx-1" style={{ color: "var(--text-muted)" }}>→</span>
                        <span style={{ color: "var(--text-muted)" }}>{tx.store}</span>
                      </div>
                      <div className="text-xs" style={{ color: "var(--text-sub)" }}>{tx.time}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold text-rose-400">-{tx.amount.toLocaleString()}원</div>
                      <div className="text-xs font-bold text-emerald-400">+{tx.earned.toLocaleString()}P (120%)</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <Navbar />
    </div>
  );
}
