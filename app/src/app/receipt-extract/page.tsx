"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { calculateNonlinear } from "@/lib/nonlinear-engine";
import Navbar from "@/components/Navbar";

interface ReceiptData {
  storeName: string;
  amount: number;
  date: string;
  category: string;
  paymentMethod: string;
}

const DEMO_RECEIPTS: ReceiptData[] = [
  { storeName: "OO마트", amount: 45000, date: "2026-02-28", category: "식자재", paymentMethod: "신용카드" },
  { storeName: "OO부동산", amount: 800000, date: "2026-02-28", category: "임대료", paymentMethod: "CMS자동이체" },
  { storeName: "한국전력", amount: 125000, date: "2026-02-28", category: "공과금", paymentMethod: "은행계좌" },
];

export default function ReceiptExtractPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [scanning, setScanning] = useState(false);
  const [scanned, setScanned] = useState(false);
  const [extractedReceipts, setExtractedReceipts] = useState<ReceiptData[]>([]);
  const [processedIndex, setProcessedIndex] = useState(-1);
  const [results, setResults] = useState<Array<{ receipt: ReceiptData; earned: number }>>([]);

  useEffect(() => {
    if (!loading && !user) router.push("/");
  }, [user, loading, router]);

  const handleScan = () => {
    setScanning(true);
    // 시뮬레이션: CMS 자동인식 영수증 금액 추출
    setTimeout(() => {
      setExtractedReceipts(DEMO_RECEIPTS);
      setScanning(false);
      setScanned(true);
    }, 2000);
  };

  const processReceipt = (index: number) => {
    const receipt = extractedReceipts[index];
    const nlResult = calculateNonlinear(receipt.amount);
    setProcessedIndex(index);

    setTimeout(() => {
      setResults((prev) => [...prev, { receipt, earned: nlResult.totalAccumulation }]);
      setProcessedIndex(-1);
    }, 1500);
  };

  const processAll = () => {
    extractedReceipts.forEach((_, i) => {
      setTimeout(() => {
        const receipt = extractedReceipts[i];
        const nlResult = calculateNonlinear(receipt.amount);
        setProcessedIndex(i);
        setTimeout(() => {
          setResults((prev) => [...prev, { receipt, earned: nlResult.totalAccumulation }]);
          setProcessedIndex(-1);
        }, 800);
      }, i * 1200);
    });
  };

  if (loading || !user) {
    return <div className="flex min-h-screen items-center justify-center text-zinc-500">로딩 중...</div>;
  }

  return (
    <div className="min-h-screen pb-20">
      {/* 헤더 */}
      <div className="dark-header border-b border-purple-900/20 bg-[#0d0d30]/80 px-5 py-4 pl-16">
        <h1 className="text-lg font-bold">영수증 자동 추출 모드</h1>
        <p className="text-xs text-zinc-500">비선형 시스템 & CMS 자동인식</p>
      </div>

      <div className="mx-auto max-w-lg px-5 py-6">
        {/* 안내 */}
        <div className="mb-4 rounded-2xl border border-cyan-500/20 p-4"
          style={{ background: "linear-gradient(135deg, rgba(6, 182, 212, 0.08), rgba(168, 85, 247, 0.08))" }}>
          <div className="text-sm font-bold text-cyan-400 mb-2">영수증 금액 자동 추출</div>
          <div className="text-xs text-zinc-400 leading-relaxed space-y-1">
            <p>소비자가 <strong className="text-white">신용(현금)카드</strong>로 상품을 결제한 후의 지출데이터를 소비자 단말기(스마트폰) & 은행결제계좌로 <strong className="text-white">지출 영수증이 전달</strong>됩니다.</p>
            <p className="mt-2">비선형 시스템 & <strong className="text-cyan-400">CMS 자동인식</strong>하는 영수증 금액 추출하는 모드에 의해 비선형시스템에 소비자 본인의 충전된 데이터에 차감하여 비선형공식에 분배 알고리즘에 의해 <strong className="text-emerald-400">120%(free) 적립</strong>됩니다.</p>
          </div>
        </div>

        {/* 프로세스 플로우 */}
        <div className="mb-4 rounded-2xl border border-purple-500/20 bg-[#14143c] p-4">
          <div className="text-xs font-bold text-purple-400 mb-3">처리 흐름</div>
          <div className="space-y-2 text-xs text-zinc-400">
            {[
              { icon: "💳", text: "신용(현금)카드 결제 완료" },
              { icon: "📱", text: "소비자 단말기(스마트폰)로 영수증 전달" },
              { icon: "🏦", text: "은행결제계좌로 지출 영수증 전달" },
              { icon: "🤖", text: "CMS 자동인식 → 영수증 금액 추출" },
              { icon: "📊", text: "충전된 데이터에서 차감" },
              { icon: "⚙️", text: "비선형공식 분배 알고리즘 실행" },
              { icon: "✅", text: "120%(free) 적립 완료" },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="text-lg">{item.icon}</span>
                <div className="h-px flex-1 border-t border-dashed border-zinc-800" />
                <span>{item.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* 스캔 버튼 */}
        {!scanned && (
          <button
            onClick={handleScan}
            disabled={scanning}
            className="w-full rounded-xl bg-gradient-to-r from-purple-600 to-cyan-500 py-4 text-sm font-bold text-white disabled:opacity-50"
          >
            {scanning ? (
              <span className="flex items-center justify-center gap-2">
                <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                CMS 자동인식 중... 영수증 금액 추출하는 모드 실행
              </span>
            ) : (
              "영수증 자동 추출 시작"
            )}
          </button>
        )}

        {/* 추출된 영수증 목록 */}
        {scanned && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="text-xs font-bold text-emerald-400">
                {extractedReceipts.length}건 영수증 자동 추출 완료
              </div>
              {results.length < extractedReceipts.length && (
                <button
                  onClick={processAll}
                  className="rounded-full bg-purple-600 px-3 py-1 text-[10px] font-bold text-white"
                >
                  전체 처리
                </button>
              )}
            </div>

            <div className="space-y-2">
              {extractedReceipts.map((receipt, i) => {
                const processed = results.find((r) => r.receipt === receipt);
                const isProcessing = processedIndex === i;

                return (
                  <div
                    key={i}
                    className="rounded-xl border p-3 transition-all"
                    style={{
                      borderColor: processed ? "rgba(16, 185, 129, 0.3)" : isProcessing ? "rgba(168, 85, 247, 0.5)" : "rgba(88, 28, 135, 0.2)",
                      background: processed ? "rgba(16, 185, 129, 0.05)" : "#14143c",
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-bold">{receipt.storeName}</div>
                        <div className="text-[10px] text-zinc-500">{receipt.category} | {receipt.paymentMethod} | {receipt.date}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-bold text-rose-400">-{receipt.amount.toLocaleString()}원</div>
                        {processed && (
                          <div className="text-sm font-black text-emerald-400">+{processed.earned.toLocaleString()}P</div>
                        )}
                      </div>
                    </div>

                    {isProcessing && (
                      <div className="mt-2 flex items-center gap-2 text-xs text-purple-400">
                        <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-purple-400 border-t-transparent" />
                        비선형공식 분배 알고리즘 실행 중...
                      </div>
                    )}

                    {processed && (
                      <div className="mt-2 text-[10px] text-zinc-500">
                        원금 {receipt.amount.toLocaleString()}P + 보너스 {(processed.earned - receipt.amount).toLocaleString()}P = <span className="text-cyan-400 font-bold">120% 적립</span>
                      </div>
                    )}

                    {!processed && !isProcessing && (
                      <button
                        onClick={() => processReceipt(i)}
                        className="mt-2 w-full rounded-lg border border-purple-500/30 py-1.5 text-xs text-purple-400 hover:bg-purple-900/20"
                      >
                        차감 & 비선형공식 적용
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            {/* 합계 */}
            {results.length > 0 && (
              <div className="mt-4 rounded-2xl border border-emerald-500/30 p-4 text-center"
                style={{ background: "linear-gradient(135deg, rgba(16, 185, 129, 0.08), rgba(6, 182, 212, 0.08))" }}>
                <div className="text-xs text-zinc-500">총 적립 (120% 증액)</div>
                <div className="mt-1 bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-3xl font-black text-transparent">
                  +{results.reduce((sum, r) => sum + r.earned, 0).toLocaleString()}P
                </div>
                <div className="mt-2 text-xs text-zinc-500">
                  원금 {results.reduce((sum, r) => sum + r.receipt.amount, 0).toLocaleString()}원 →
                  비선형시스템 계좌에 120% 적립 완료
                </div>

                {/* 펀드존 안내 */}
                <div className="mt-3 rounded-xl border border-purple-500/20 bg-purple-900/10 p-3 text-xs text-zinc-400 text-left">
                  <div className="text-purple-400 font-bold mb-1">멤버십 : 펀드존 : 120%</div>
                  <p>100% : 지출원금 + 20% : 증액 = 120%</p>
                  <p className="mt-1">1초에 20%를 적립하므로</p>
                  <p className="mt-1">적립 우선순위: <span className="text-cyan-400">은행 → 보험사 → 신용카드사 → 사업주</span> (단위 1억 이상) → 소비자 적립</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <Navbar />
    </div>
  );
}
