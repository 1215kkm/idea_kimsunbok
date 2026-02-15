"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import Navbar from "@/components/Navbar";

export default function SimulationPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.push("/");
  }, [user, loading, router]);

  if (loading || !user) {
    return <div className="flex min-h-screen items-center justify-center dark-text-muted">로딩 중...</div>;
  }

  return (
    <div className="min-h-screen pb-20">
      {/* 헤더 */}
      <div className="dark-header border-b border-purple-900/20 bg-[#0d0d30]/80 px-5 py-4 pl-16">
        <h1 className="text-lg font-bold">다랜드 마을 시뮬레이션</h1>
        <p className="text-xs dark-text-muted text-zinc-500">비선형공식 체험 게임</p>
      </div>

      {/* 게임 iframe */}
      <div className="relative w-full" style={{ height: "calc(100vh - 140px)" }}>
        <iframe
          src="/simulation.html"
          className="h-full w-full border-0"
          title="다랜드 마을 시뮬레이션"
          allow="fullscreen"
        />
      </div>

      <Navbar />
    </div>
  );
}
