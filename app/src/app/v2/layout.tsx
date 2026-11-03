import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "다랜드 · 큰 글씨",
  description: "큰 글씨와 큰 버튼만 있는 다랜드 간단 화면",
};

/** 간단 화면(v2): 기존 앱과 같은 계정·데이터, 화면만 크고 단순하게 */
export default function V2Layout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-[#F7F8FC] text-[22px] leading-relaxed text-[#1A1F36]">{children}</div>;
}
