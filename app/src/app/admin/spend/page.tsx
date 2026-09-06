"use client";

import PageHeader from "@/components/admin/PageHeader";
import AdminIcon from "@/components/admin/AdminIcon";

/** 지출 — P1-3 자리 (탭: 지출 항목 · 영수증 검증 (OCR) · 수동 분할). 사이드바 위치만 잡아 둔다. */
export default function AdminSpendPage() {
  return (
    <>
      <PageHeader title="지출" sub="지출 항목 · 영수증 검증 (OCR) · 수동 분할 (P1)" />
      <div className="ad-card">
        <div className="ad-placeholder">
          <div>
            <div className="ad-tile">
              <AdminIcon name="receipt" />
            </div>
            <div>P1-3 지출 관리(OCR 미검증 목록 · 수동 분할 대기 · 리워드(보상)광고 항목)에서 연결됩니다.</div>
          </div>
        </div>
      </div>
    </>
  );
}
