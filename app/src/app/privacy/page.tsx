"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";

/**
 * 개인정보 수집 및 이용 방침 (베타)
 * 개인정보보호법상 필수 고지 항목(수집 항목·목적·보유기간·거부권)을 담는다.
 * 실서비스 전환 시 전문가 검토를 거쳐 확정.
 */
export default function PrivacyPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.push("/");
  }, [user, loading, router]);

  if (loading || !user) {
    return <div className="flex min-h-screen items-center justify-center text-[#6B7394]">로딩 중...</div>;
  }

  return (
    <div className="min-h-screen pb-20">
      <div className="dark-header border-b border-[#E8EAF0] bg-white/95 px-5 py-4 pl-16 pr-16 lg:px-6">
        <div className="flex items-center gap-2">
          <Link href="/dashboard" className="text-[#6B7394] hover:text-[#1A1F36]">&larr;</Link>
          <div>
            <h1 className="text-lg font-bold">개인정보 수집 및 이용 동의</h1>
            <p className="text-xs dark-text-muted text-[#6B7394]">다랜드 개인정보 처리방침 (베타)</p>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-5 py-6">
        <div className="mb-6 rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4 text-xs leading-relaxed text-[#6B7394]">
          <div className="mb-1 flex items-center gap-2 text-sm font-bold text-amber-700"><span>⚠️</span> 베타 안내</div>
          <p>본 방침은 <strong className="text-[#1A1F36]">베타 테스트용 초안</strong>이며, 정식 출시 전 개인정보 전문가·법률 검토를 거쳐 확정됩니다.</p>
        </div>

        <p className="mb-5 text-sm text-[#1A1F36]">다랜드 서비스 제공을 위해 아래와 같이 개인정보를 수집 및 이용합니다.</p>

        {/* 1. 수집 항목 */}
        <h2 className="mb-2 text-base font-bold text-[#3B4CCA]">1. 수집하는 개인정보 항목</h2>
        <div className="mb-6 overflow-x-auto">
          <table className="w-full border-collapse text-xs">
            <tbody>
              {([
                ["필수 항목", "이름, 휴대폰 번호, 이메일, 비밀번호"],
                ["선택 항목", "주소, 생년월일, 성별, 프로필 이미지"],
                ["서비스 이용 과정 자동 수집", "접속 IP, 쿠키, 접속 일시, 이용 기록, 기기 정보"],
              ] as [string, string][]).map(([k, v]) => (
                <tr key={k}>
                  <th className="w-40 border border-[#E8EAF0] bg-[#F7F8FC] p-2 text-left align-top font-bold text-[#1A1F36]">{k}</th>
                  <td className="border border-[#E8EAF0] p-2 text-[#6B7394]">{v}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* 2. 목적 */}
        <h2 className="mb-2 text-base font-bold text-[#3B4CCA]">2. 개인정보 수집 및 이용 목적</h2>
        <ul className="mb-6 ml-4 list-disc space-y-1 text-sm text-[#6B7394]">
          <li>회원가입 및 본인확인, 서비스 이용자 식별</li>
          <li>다랜드 서비스 제공 및 운영</li>
          <li>결제, 포인트 적립/사용, 정산 및 고객 지원</li>
          <li>공지사항 안내 및 마케팅 정보 제공 (선택 동의 시)</li>
          <li>서비스 개선 및 신규 서비스 개발</li>
        </ul>

        {/* 3. 보유기간 */}
        <h2 className="mb-2 text-base font-bold text-[#3B4CCA]">3. 개인정보 보유 및 이용 기간</h2>
        <p className="mb-6 text-sm text-[#6B7394]">회원 탈퇴 시까지 보유·이용하며, 관계 법령에 따라 보존이 필요한 경우 해당 기간 동안 보관 후 지체 없이 파기합니다.</p>

        {/* 4. 거부권 */}
        <h2 className="mb-2 text-base font-bold text-[#3B4CCA]">4. 동의 거부 권리 및 불이익 안내</h2>
        <p className="mb-2 text-sm text-[#6B7394]">이용자는 개인정보 수집 및 이용에 대한 동의를 거부할 수 있습니다.</p>
        <p className="text-sm text-[#6B7394]">단, 필수 항목에 대한 동의를 거부하실 경우 회원가입 및 서비스 이용이 제한될 수 있습니다.</p>

        <p className="pt-6 text-center text-xs text-[#6B7394]">본 방침은 베타 테스트용 초안이며, 정식 출시 시점에 확정·시행됩니다.</p>
      </div>

      <Navbar />
    </div>
  );
}
