"use client";

import PageHeader from "@/components/admin/PageHeader";
import AdminIcon from "@/components/admin/AdminIcon";

/** 입금 — P1-2 자리. 사이드바 위치만 잡아 둔다. */
export default function AdminDepositsPage() {
  return (
    <>
      <PageHeader title="입금" sub="입금 확인 · CMS 등록 (P1)" />
      <div className="ad-card">
        <div className="ad-placeholder">
          <div>
            <div className="ad-tile">
              <AdminIcon name="deposit" />
            </div>
            <div>P1-2 입금 확인 흐름(deposits pending → 관리자 confirm, CMS 등록 접수)에서 연결됩니다.</div>
          </div>
        </div>
      </div>
    </>
  );
}
