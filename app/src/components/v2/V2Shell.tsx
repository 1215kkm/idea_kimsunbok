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
  /** 내용 맨 끝에 놓는 버튼 (내용이 짧으면 화면 맨 아래로 내려간다) */
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
    <div className="flex min-h-screen flex-col pb-10">
      <header className="sticky top-0 z-20 border-b-2 border-[#BEC4D4] bg-white">
        <div className="mx-auto flex min-h-[88px] max-w-xl items-center gap-4 px-5">
          {back && (
            <Link
              href={back}
              className="flex min-h-[64px] items-center rounded-2xl border-2 border-[#BEC4D4] px-5 text-[24px] font-black text-[#1A1F36] active:scale-95"
            >
              ← 뒤로
            </Link>
          )}
          <h1 className="text-[30px] font-black text-[#1A1F36]">{title}</h1>
        </div>
      </header>
      <main className={`mx-auto flex w-full max-w-xl flex-1 flex-col px-5 ${action ? "gap-5 pt-5" : "gap-7 pt-7"}`}>
        {children}
        {action && <div className="mt-auto pt-2">{action}</div>}
      </main>
    </div>
  );
}
