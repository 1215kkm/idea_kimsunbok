"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { isConfigured } from "@/lib/firebase";
import { apiGet } from "@/lib/api-client";
import Link from "next/link";

/**
 * 구 "리워드 초대" 화면 — 새 리워드광고 홈(/advertiser)으로 대체됐다.
 * 구 베타 초대 코드가 남아 있는 광고주에게만 "지급 중단" 안내를 한 번 보여주고 (코드·URL 텍스트는 노출하지 않음),
 * 그 외에는 즉시 새 홈으로 보낸다.
 */
export default function LegacyInvitePage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [legacy, setLegacy] = useState<"checking" | "none" | "found">("checking");

  useEffect(() => {
    if (!loading && !user) router.replace("/");
  }, [user, loading, router]);

  useEffect(() => {
    if (!user) return;
    if (!isConfigured) {
      router.replace("/advertiser");
      return;
    }
    let cancelled = false;
    apiGet<{ ok: boolean; active: { code: string } | null }>("/api/invite/code")
      .then((r) => {
        if (cancelled) return;
        if (r.active) setLegacy("found");
        else router.replace("/advertiser");
      })
      .catch(() => {
        if (!cancelled) router.replace("/advertiser");
      });
    return () => {
      cancelled = true;
    };
  }, [user, router]);

  if (loading || !user || legacy !== "found") {
    return <div className="flex min-h-screen items-center justify-center text-[#6B7394]">리워드광고로 이동 중...</div>;
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-6">
      <div className="w-full max-w-sm rounded-2xl border border-amber-500/30 bg-amber-50 p-5 text-xs leading-relaxed text-[#6B7394]">
        <div className="mb-1 text-sm font-bold text-amber-700">지급 중단 (베타 초대)</div>
        <p>
          예전에 발급받은 베타 초대 코드는 더 이상 리워드가 지급되지 않습니다. 새 <strong className="text-[#1A1F36]">리워드광고</strong>에서
          캠페인을 만들면 내 예산에서 가입 회원에게 지급됩니다.
        </p>
        <Link
          href="/advertiser"
          className="mt-4 block rounded-xl bg-[#FFB800] py-3 text-center text-sm font-bold text-[#1A1F36] hover:bg-[#E5A600]"
        >
          리워드광고로 이동
        </Link>
      </div>
    </div>
  );
}
