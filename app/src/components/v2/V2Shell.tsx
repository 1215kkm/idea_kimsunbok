"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { useAuth } from "@/contexts/AuthContext";

/**
 * 간단 화면(v2) 틀 — 위에 큰 "뒤로" 버튼과 제목 하나, 아래는 넉넉한 여백.
 * 로그인하지 않았으면 v2 첫 화면으로 보낸다.
 */
interface Props {
  title: string;
  /** 뒤로 갈 곳 (없으면 뒤로 버튼 없음) */
  back?: string;
  /** 화면 맨 아래에 붙어 있는 버튼 — 숫자판처럼 긴 화면에서도 스크롤 없이 누를 수 있게 */
  action?: ReactNode;
  children: ReactNode;
}

export default function V2Shell({ title, back, action, children }: Props) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.replace("/v2");
  }, [user, loading, router]);

  if (loading || !user) {
    return <div className="flex min-h-screen items-center justify-center text-[26px] text-[#6B7394]">잠시만요…</div>;
  }

  return (
    <div className={`min-h-screen ${action ? "pb-48" : "pb-16"}`}>
      <header className="sticky top-0 z-20 border-b-2 border-[#E8EAF0] bg-white">
        <div className="mx-auto flex min-h-[88px] max-w-xl items-center gap-4 px-5">
          {back && (
            <Link
              href={back}
              className="flex min-h-[64px] items-center rounded-2xl border-2 border-[#E8EAF0] px-5 text-[24px] font-black text-[#1A1F36] active:scale-95"
            >
              ← 뒤로
            </Link>
          )}
          <h1 className="text-[30px] font-black text-[#1A1F36]">{title}</h1>
        </div>
      </header>
      <main className={`mx-auto flex max-w-xl flex-col px-5 ${action ? "gap-6 pt-6" : "gap-10 pt-10"}`}>{children}</main>
      {action && (
        <div className="fixed inset-x-0 bottom-0 z-20 border-t-2 border-[#E8EAF0] bg-white/95 pb-[max(16px,env(safe-area-inset-bottom))] pt-4 backdrop-blur">
          <div className="mx-auto max-w-xl px-5">{action}</div>
        </div>
      )}
    </div>
  );
}
