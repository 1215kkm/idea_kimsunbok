"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { errorMessage, listUsers } from "@/lib/admin-data";
import type { AdminUser } from "@/lib/admin-types";
import { fmt, fmtDate, fmtP } from "@/lib/admin-format";
import { ADVERTISER_MIN_DEPOSIT } from "@/lib/reward-ledger";
import PageHeader from "@/components/admin/PageHeader";
import KpiCard from "@/components/admin/KpiCard";
import DataTable, { type Column } from "@/components/admin/DataTable";
import FilterChips from "@/components/admin/FilterChips";
import AdminIcon from "@/components/admin/AdminIcon";
import { useToast } from "@/components/admin/Toast";

type Filter = "all" | "advertiser" | "business" | "admin";
const FILTERS: Filter[] = ["all", "advertiser", "business", "admin"];
const LABEL: Record<Filter, string> = { all: "전체", advertiser: "광고주 (입금 ≥ 10만)", business: "기업", admin: "관리자" };

function matches(u: AdminUser, f: Filter): boolean {
  if (f === "all") return true;
  if (f === "advertiser") return u.isAdvertiser;
  if (f === "business") return u.memberType === "business";
  return u.role === "admin";
}

/** 회원 (P0-6 이관): 잔액·잠김·구분 컬럼 + 광고주 필터. 기능 변화 없음 (검색 · 목록). */
export default function AdminMembersPage() {
  return (
    <Suspense fallback={<div className="ad-muted">불러오는 중...</div>}>
      <MembersScreen />
    </Suspense>
  );
}

function MembersScreen() {
  const toast = useToast();
  const router = useRouter();
  const params = useSearchParams();
  const initial = params.get("filter");
  const [filter, setFilter] = useState<Filter>(FILTERS.includes(initial as Filter) ? (initial as Filter) : "all");
  const [search, setSearch] = useState("");
  const [users, setUsers] = useState<AdminUser[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(
    async (silent = false) => {
      setRefreshing(true);
      setError(null);
      try {
        setUsers(await listUsers());
        if (!silent) toast("최신 데이터로 갱신했습니다");
      } catch (err) {
        setError(errorMessage(err, "회원 조회 실패"));
        console.error("[admin/members]", err);
      } finally {
        setRefreshing(false);
      }
    },
    [toast],
  );

  useEffect(() => {
    load(true);
  }, [load]);

  const counts = useMemo(() => {
    const c: Record<Filter, number> = { all: 0, advertiser: 0, business: 0, admin: 0 };
    for (const u of users || []) for (const f of FILTERS) if (matches(u, f)) c[f] += 1;
    return c;
  }, [users]);

  const weekStart = Date.now() - 7 * 86_400_000;
  const weekSignups = (users || []).filter((u) => u.createdAt && u.createdAt >= weekStart).length;

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (users || []).filter(
      (u) => matches(u, filter) && (!q || u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q) || u.role.toLowerCase().includes(q)),
    );
  }, [users, filter, search]);

  const applyFilter = (f: Filter) => {
    setFilter(f);
    router.replace(f === "all" ? "/admin/members" : `/admin/members?filter=${f}`);
  };

  const columns: Column<AdminUser>[] = [
    {
      key: "who",
      header: "회원",
      render: (u) => (
        <>
          <strong>{u.name || "(이름 없음)"}</strong>
          <span className="ad-sub">{u.email || u.id}</span>
        </>
      ),
    },
    {
      key: "type",
      header: "구분",
      render: (u) => (
        <span style={{ display: "inline-flex", gap: 4, flexWrap: "wrap" }}>
          {u.role === "admin" && <span className="ad-chip red">관리자</span>}
          {u.memberType === "business" ? <span className="ad-chip blue">기업</span> : <span className="ad-chip gray">일반</span>}
          {u.isAdvertiser && <span className="ad-chip purple">광고주</span>}
        </span>
      ),
    },
    { key: "balance", header: "잔액", align: "right", render: (u) => <span className="ad-num" style={{ fontWeight: 700, color: "var(--primary)" }}>{fmtP(u.totalPoints)}</span> },
    { key: "locked", header: "잠김 (에스크로)", align: "right", render: (u) => <span className="ad-num" style={{ color: u.lockedPoints > 0 ? "var(--foreground)" : "var(--text-muted)" }}>{fmtP(u.lockedPoints)}</span> },
    { key: "deposit", header: "입금 누적", align: "right", render: (u) => <span className="ad-num">{fmtP(u.depositTotal)}</span> },
    { key: "level", header: "등급", render: (u) => <span className="ad-num">Lv.{u.membershipLevel}</span> },
    { key: "created", header: "가입일", render: (u) => <span className="ad-num">{fmtDate(u.createdAt)}</span> },
  ];

  return (
    <>
      <PageHeader
        title="회원"
        sub={`일반 · 기업 · 광고주 — 광고주 자격은 확인된 입금 누적 ${fmt(ADVERTISER_MIN_DEPOSIT)}P 이상`}
        search={{ value: search, onChange: setSearch, placeholder: "이름 · 이메일 · 역할 검색" }}
        onRefresh={() => load()}
        refreshing={refreshing}
      />

      {error && (
        <div className="ad-callout error" style={{ marginTop: 0, marginBottom: "var(--ad-sp-lg)" }}>
          <AdminIcon name="alert" />
          <div>{error}</div>
        </div>
      )}

      <div className="ad-kpis">
        <KpiCard icon="users" tone="primary" label="총회원" value={users ? users.length : null} unit="명" delta="최근 가입순 200명까지" onClick={() => applyFilter("all")} />
        <KpiCard icon="receipt" tone="info" label="기업회원" value={users ? counts.business : null} unit="명" delta="기업 가입 폼은 P1-1" onClick={() => applyFilter("business")} />
        <KpiCard icon="megaphone" tone="success" label="광고주 (입금 ≥ 10만)" value={users ? counts.advertiser : null} unit="명" delta="캠페인 제출 가능" onClick={() => applyFilter("advertiser")} />
        <KpiCard icon="user-plus" tone="warning" label="이번 주 가입" value={users ? weekSignups : null} unit="명" delta="최근 7일" />
      </div>

      <div className="ad-card">
        <div className="ad-card-head">
          <div className="ad-tile"><AdminIcon name="users" /></div>
          <h2>회원 목록</h2>
        </div>
        <FilterChips chips={FILTERS.map((f) => ({ key: f, label: LABEL[f], count: users ? counts[f] : undefined }))} active={filter} onChange={applyFilter} />
        <DataTable columns={columns} rows={rows} rowKey={(u) => u.id} loading={!users} emptyText={users && users.length === 0 ? "회원 데이터가 없습니다." : "검색 결과가 없습니다."} minWidth={900} />
        <div className="ad-card-foot">잠김 = 캠페인 제출 시 에스크로로 옮겨진 예산. 출금 가능 잔액에서 제외됩니다. 구분 변경 · 광고주 자격 강제 부여 · 상세(거래·캠페인 이력)는 P1.</div>
      </div>
    </>
  );
}
