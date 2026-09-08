"use client";

import PageHeader from "@/components/admin/PageHeader";
import AdminIcon from "@/components/admin/AdminIcon";

/** 공지 — P1-7 자리. 사이드바 위치만 잡아 둔다. */
export default function AdminNoticesPage() {
  return (
    <>
      <PageHeader title="공지" sub="공지 작성 · 게시 · 내리기 (P1)" />
      <div className="ad-card">
        <div className="ad-placeholder">
          <div>
            <div className="ad-tile">
              <AdminIcon name="notice" />
            </div>
            <div>P1-7 공지 관리(대상: 전체 / 광고주 / 기업)에서 연결됩니다.</div>
          </div>
        </div>
      </div>
    </>
  );
}
