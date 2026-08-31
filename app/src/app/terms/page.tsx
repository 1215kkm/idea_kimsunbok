"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";

/**
 * 이용약관 (베타)
 *
 * 의뢰자 요청: 총량유지 순환구조 + 차액 처리 방식을 약관에 명시.
 * 단, 베타 기간(가상 포인트)이며 실제 자금이동·차액 자동이체는 관계법령
 * (전자금융거래법 등) 검토 및 회원 개별 동의 절차 완료 후 정식 출시 시점에
 * 적용된다는 점을 명확히 고지 (표시광고·유사수신 리스크 관리).
 */

// 총량유지 순환 흐름도 단계
const FLOW = [
  { icon: "🏦", label: "다랜드 계좌", pct: "100%" },
  { icon: "🏛️", label: "은행계좌 이체", pct: "100%" },
  { icon: "💳", label: "카드 결제", pct: "100%" },
  { icon: "🔎", label: "OCR 인식", pct: "→" },
  { icon: "🔄", label: "다랜드 재충전", pct: "120%" },
];

export default function TermsPage() {
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
            <h1 className="text-lg font-bold">이용약관</h1>
            <p className="text-xs dark-text-muted text-[#6B7394]">다랜드 서비스 이용약관 (베타)</p>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-5 py-6">
        {/* 베타·법무 검토 고지 */}
        <div className="mb-6 rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4 text-xs leading-relaxed text-[#6B7394]">
          <div className="mb-1 flex items-center gap-2 text-sm font-bold text-amber-700">
            <span>⚠️</span> 베타 안내 · 법무 검토 예정
          </div>
          <p>본 약관은 <strong className="text-[#1A1F36]">베타 테스트용 초안</strong>이며, 현재 포인트(P)는 <strong className="text-[#1A1F36]">가상 포인트(실화폐 아님)</strong>입니다.</p>
          <p className="mt-1">§3의 <strong className="text-[#1A1F36]">차액 자동이체 등 자금이동 관련 조항</strong>은 관계법령(전자금융거래법·신용정보법 등) 검토 및 회원 개별 동의 절차 완료 후, <strong className="text-[#1A1F36]">정식 출시 시점</strong>에 적용됩니다. 베타 기간에는 적용되지 않습니다.</p>
          <p className="mt-1">최종 약관은 <strong className="text-[#1A1F36]">법률 전문가의 검토·확정</strong>을 거칩니다.</p>
        </div>

        <div className="space-y-6 text-sm leading-relaxed text-[#1A1F36]">
          {/* 제1조 */}
          <Section title="제1조 (목적)">
            이 약관은 다랜드(DaLand) 결제플랫폼(이하 &quot;회사&quot;)이 제공하는 서비스의 이용조건 및 절차, 회사와 회원 간의 권리·의무 및 책임사항을 규정함을 목적으로 합니다.
          </Section>

          {/* 제2조 */}
          <Section title="제2조 (정의)">
            <ol className="ml-4 list-decimal space-y-1 text-[#6B7394]">
              <li>&quot;서비스&quot;란 회사가 제공하는 입금·지출·출금·리워드광고·포인트 적립 등 제반 서비스를 말합니다.</li>
              <li>&quot;회원&quot;이란 본 약관에 동의하고 가입 절차를 거쳐 서비스를 이용하는 개인 또는 법인을 말합니다.</li>
              <li>&quot;포인트(P)&quot;란 회사의 비선형공식(Model A)에 의해 산정·적립되는 <strong>가상의 디지털 가치단위</strong>로, 1P는 1원과 동일한 가치를 가집니다. (베타 기간에는 실화폐로 환급되지 않습니다.)</li>
            </ol>
          </Section>

          {/* 제3조 — 핵심 */}
          <div className="rounded-2xl border-2 border-[#3B4CCA]/30 bg-[#3B4CCA]/4 p-5">
            <h2 className="mb-3 text-base font-bold text-[#3B4CCA]">제3조 (총량유지 모드 및 적립 방식)</h2>

            <div className="space-y-4 text-[#6B7394]">
              <div>
                <div className="mb-1 text-sm font-bold text-[#1A1F36]">1. 총량유지 모드</div>
                <p>비선형공식 Model A는 총량 유지를 위해 존재하며, 회원의 자산이 지출·이체 등 거래 후에도 총량이 유지되도록 하는 것을 기본 원칙으로 합니다.</p>
              </div>

              <div>
                <div className="mb-2 text-sm font-bold text-[#1A1F36]">2. 총량유지 순환구조</div>
                <p className="mb-3">다랜드 계좌의 데이터는 선택한 지출 항목에 대해 은행계좌로 이체한 뒤, 아래 순환 구조로 운영됩니다.</p>
                {/* 흐름도 */}
                <div className="overflow-x-auto">
                  <div className="flex min-w-max items-center gap-1">
                    {FLOW.map((f, i) => (
                      <div key={f.label} className="flex items-center gap-1">
                        <div className="flex w-20 flex-col items-center rounded-xl border border-[#E8EAF0] bg-white p-2 text-center">
                          <span className="text-xl">{f.icon}</span>
                          <span className="mt-1 text-[10px] font-bold text-[#1A1F36]">{f.label}</span>
                          <span className="text-[10px] text-[#3B4CCA]">{f.pct}</span>
                        </div>
                        {i < FLOW.length - 1 && <span className="text-[#3B4CCA]">→</span>}
                      </div>
                    ))}
                  </div>
                </div>
                <p className="mt-2 text-[11px]">※ 카드 결제(재지출)가 <strong className="text-[#1A1F36]">실제로 발생한 경우에 한하여</strong> OCR 인식 후 120% 재충전됩니다. 출금 자체는 1P=1원으로 100% 이체됩니다.</p>
              </div>

              <div>
                <div className="mb-1 text-sm font-bold text-[#1A1F36]">3. 차액 처리 방식</div>
                <ol className="ml-4 list-decimal space-y-1">
                  <li>카드 결제 후 금액이 남는 경우, 남은 차액은 다랜드 내 계좌로 이체할 수 있으며 이 경우 총량유지 모드를 적용하지 않습니다.</li>
                  <li>카드 결제금액이 다랜드 이체금액보다 큰 경우, 초과 차액분은 다랜드 계좌로 이체하여 적립합니다.</li>
                </ol>
                <p className="mt-1 rounded-lg bg-white/70 p-2 text-[11px]">
                  <strong className="text-amber-700">※ 자금이동 고지:</strong> 위 차액의 자동이체는 회원 은행계좌에서의 출금이체를 수반하므로, <strong className="text-[#1A1F36]">전자금융거래법 등 관계법령 검토 및 회원의 사전·개별 동의</strong>를 거쳐 정식 출시 시점에 적용됩니다. 등록 자동이체(CMS) 사업자와의 제휴로 수행합니다.
                </p>
              </div>

              <div>
                <div className="mb-1 text-sm font-bold text-[#1A1F36]">4. 총량 유지 원칙</div>
                <p>위 방식을 통해 회원의 총량(원금 + 적립금)이 유지되도록 설계·운영되며, 회원의 지출·이체는 본 조의 순환 구조에 따라 처리됩니다.</p>
              </div>
            </div>
          </div>

          <Section title="제4조 (서비스의 내용)">
            <ol className="ml-4 list-decimal space-y-1 text-[#6B7394]">
              <li>회사는 회원에게 ① 입금 ② 지출 ③ 출금 ④ 리워드(보상)광고 ⑤ 기타 회사가 정하는 서비스를 제공합니다.</li>
              <li>회사는 비선형공식(Model A)에 따라 회원의 지출금액에 대해 120% 적립(총량 유지)하는 시스템을 운영합니다.</li>
              <li>회사는 서비스의 품질·운영·기술상 필요에 따라 서비스의 전부 또는 일부를 변경·중단할 수 있습니다.</li>
            </ol>
          </Section>

          <Section title="제5조 (회원가입 및 이용계약)">
            <ol className="ml-4 list-decimal space-y-1 text-[#6B7394]">
              <li>회원은 가입 절차에 따라 회원정보를 기입하고 본 약관에 동의함으로써 가입을 신청합니다.</li>
              <li>타인 명의 도용, 허위 정보 기재, 관계법령·사회질서에 반하는 경우 승낙을 거절·제한할 수 있습니다.</li>
              <li>만 19세 미만 회원은 법정대리인의 동의를 받아 가입할 수 있습니다.</li>
            </ol>
          </Section>

          <Section title="제6조 (회원의 의무)">
            <ol className="ml-4 list-decimal space-y-1 text-[#6B7394]">
              <li>회원은 관계법령, 본 약관, 이용안내 및 주의사항을 준수하여야 합니다.</li>
              <li>타인 정보 도용·허위정보 제공·부정한 방법으로 서비스 이용 시 모든 책임을 부담합니다.</li>
              <li>본인 계정·비밀번호 관리 책임이 있으며, 제3자에게 양도·대여할 수 없습니다.</li>
            </ol>
          </Section>

          <Section title="제7조 (포인트 적립 및 사용)">
            <ol className="ml-4 list-decimal space-y-1 text-[#6B7394]">
              <li>회원이 지출한 금액은 비선형공식(Model A)에 의해 120%로 적립되며, 총량유지 모드에 따라 운영됩니다.</li>
              <li>적립 포인트는 서비스 내에서 사용할 수 있으며, 회사가 정한 사용처·조건에 따릅니다. (정식 출시 시 은행계좌 출금 지원)</li>
              <li>포인트 적립·사용 내역은 서비스 내에서 확인할 수 있습니다.</li>
            </ol>
          </Section>

          <Section title="제8조 (출금 및 총량 유지)">
            <ol className="ml-4 list-decimal space-y-1 text-[#6B7394]">
              <li>회원이 출금을 신청한 경우, <strong className="text-[#1A1F36]">출금 금액의 100%가 회원 은행계좌로 이체(1P=1원)</strong>되며, 출금 자체에는 증액이 적용되지 않습니다.</li>
              <li>출금한 금액을 회원이 카드로 재지출하고 OCR로 인식된 경우에 한하여, 해당 지출은 별도의 지출 거래로서 비선형공식에 의해 120% 재충전됩니다.</li>
              <li>제3조의 차액 처리(자동이체)는 관계법령 검토 및 회원 개별 동의 후 정식 출시 시점에 적용됩니다.</li>
              <li>회원 탈퇴 시 충전 잔액은 100% 환불하며, 총량유지 원칙에 따라 처리됩니다.</li>
            </ol>
          </Section>

          <Section title="제9조 (리워드(보상)광고 및 수익 배분)">
            <ol className="ml-4 list-decimal space-y-1 text-[#6B7394]">
              <li>회사는 회원이 설정한 조건에 따라 SNS(유튜브·네이버·카카오톡·인스타그램 등)를 통해 리워드 광고를 발송할 수 있습니다.</li>
              <li>광고를 시청하고 신규 가입한 회원에게는 회사가 정한 포인트가 분배됩니다.</li>
              <li>광고주가 유치한 회원의 지출금액의 5%가 추가 수익으로 적립되며, 이는 소비자 비용 부담 없이 비선형공식(Model A)에 의해 처리됩니다.</li>
            </ol>
          </Section>

          <Section title="제10조 (기타)">
            <ol className="ml-4 list-decimal space-y-1 text-[#6B7394]">
              <li>본 약관에 명시되지 않은 사항은 관계법령과 회사의 서비스 운영정책에 따릅니다.</li>
              <li>회사는 본 약관을 변경할 수 있으며, 변경 시 시행일 7일 전까지 서비스 내 공지합니다.</li>
              <li>본 약관은 베타 서비스용 초안으로, 정식 출시 전 법률 전문가의 검토를 거쳐 확정됩니다.</li>
            </ol>
          </Section>

          {/* ===== 부칙 (법적 카브아웃 — 리스크 관리) ===== */}
          <div className="rounded-2xl border-2 border-[#3B4CCA]/25 bg-[#3B4CCA]/4 p-5">
            <h2 className="mb-3 text-base font-bold text-[#3B4CCA]">부칙</h2>
            <div className="space-y-4 text-[#6B7394]">
              <div>
                <div className="mb-1 text-sm font-bold text-[#1A1F36]">제1조 (투자금에 관한 특칙)</div>
                <p>투자금은 총량유지 비선형공식(Model A)의 총량유지모드를 <strong className="text-[#1A1F36]">적용하지 않습니다.</strong> 투자금의 입금·사용·회수 및 정산은 관계 법령과 별도의 계약 또는 운영정책에 따릅니다.</p>
              </div>
              <div>
                <div className="mb-1 text-sm font-bold text-[#1A1F36]">제2조 (세금·벌금·과징금 등의 처리)</div>
                <ol className="ml-4 list-decimal space-y-1">
                  <li>「지출」에서 세금 납부에 관한 항목을 운영할 수 있습니다.</li>
                  <li><strong className="text-[#1A1F36]">벌금·과징금 등 법령에 따라 본인이 직접 부담하여야 하는 금액</strong>은 다랜드의 적립금·리워드·총량유지모드에 따른 지급 대상으로 처리하지 않으며, 해당 소비자 또는 납부의무자가 본인 부담으로 납부합니다.</li>
                  <li>세금 등의 납부 가능 여부와 처리방법은 관계 법령 및 해당 기관의 납부기준에 따릅니다.</li>
                </ol>
              </div>
              <div>
                <div className="mb-1 text-sm font-bold text-[#1A1F36]">제3조 (관계 법령 우선)</div>
                <p>본 약관 및 부칙의 내용이 <strong className="text-[#1A1F36]">관계 법령의 강행규정과 충돌하는 경우에는 관계 법령을 우선</strong>하여 적용합니다.</p>
              </div>
              <div>
                <div className="mb-1 text-sm font-bold text-[#1A1F36]">제4조 (부칙의 변경 및 시행)</div>
                <p>회사는 관계 법령의 개정, 서비스 내용의 변경 또는 운영상 필요한 경우 본 부칙을 변경할 수 있으며, 회원의 권리·의무에 중대한 영향을 미치는 변경사항은 사전에 고지합니다. 본 부칙은 정식 출시 시점에 시행됩니다.</p>
              </div>
            </div>
          </div>

          <p className="pt-4 text-center text-xs text-[#6B7394]">
            시행일(예정): 정식 출시 시점 · 본 초안은 베타 테스트용입니다. ·{" "}
            <Link href="/privacy" className="text-[#3B4CCA] underline">개인정보 처리방침</Link>
          </p>
        </div>
      </div>

      <Navbar />
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="mb-2 text-base font-bold text-[#3B4CCA]">{title}</h2>
      <div className="text-[#6B7394]">{children}</div>
    </div>
  );
}
