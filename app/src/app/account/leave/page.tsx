"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { isConfigured } from "@/lib/firebase";
import {
  getBalance as getDemoBalance,
  withdrawUser,
} from "@/lib/demo-store";
import { calculateWithdrawalRefund } from "@/lib/nonlinear-engine";
import Navbar from "@/components/Navbar";
import Link from "next/link";

type Step = "info" | "reason" | "confirm" | "complete";

const REASONS = [
  "사용 빈도가 낮아서",
  "다른 서비스를 이용 중이라서",
  "개인정보 우려",
  "서비스에 불만이 있어서",
  "기타",
];

export default function AccountLeavePage() {
  const { user, loading, signOut } = useAuth();
  const router = useRouter();
  const [step, setStep] = useState<Step>("info");
  const [balance, setBalance] = useState(0);
  const [selectedReason, setSelectedReason] = useState("");
  const [customReason, setCustomReason] = useState("");
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.push("/");
  }, [user, loading, router]);

  useEffect(() => {
    if (!user) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setBalance(getDemoBalance(user));
  }, [user]);

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center dark-text-muted">
        로딩 중...
      </div>
    );
  }

  const refund = calculateWithdrawalRefund(balance);
  const reason =
    selectedReason === "기타" ? customReason || "기타" : selectedReason;

  const handleWithdraw = () => {
    setProcessing(true);
    setTimeout(async () => {
      if (!isConfigured) {
        withdrawUser(user, refund.refundAmount, refund.systemProfit, reason);
      }
      await signOut();
      setProcessing(false);
      setStep("complete");
    }, 1500);
  };

  return (
    <div className="min-h-screen pb-20">
      <div className="dark-header border-b border-[#E8EAF0] bg-white/95 px-5 py-4 pl-16">
        <div className="flex items-center gap-2">
          <Link
            href="/dashboard"
            className="text-[#6B7394] hover:text-[#1A1F36]"
          >
            &larr;
          </Link>
          <div>
            <h1 className="text-lg font-bold">회원 탈퇴</h1>
            <p className="text-xs dark-text-muted text-[#6B7394]">
              탈퇴 및 환불 안내
            </p>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-lg px-5 py-5">
        {/* Step 1: 잔액 확인 + 환불 안내 */}
        {step === "info" && (
          <div className="space-y-4">
            <div
              className="rounded-2xl border border-[#EF4444]/20 p-5 text-center"
              style={{
                background:
                  "linear-gradient(135deg, rgba(239, 68, 68, 0.06), rgba(168, 85, 247, 0.06))",
              }}
            >
              <div className="text-sm text-[#6B7394]">
                탈퇴 시 환불 예상 금액
              </div>
              <div className="mt-2 text-4xl font-black text-[#3B4CCA]">
                {refund.refundAmount.toLocaleString()}P
              </div>
              <div className="mt-1 text-xs text-[#6B7394]">
                = {refund.refundAmount.toLocaleString()}원 (1P = 1원)
              </div>
            </div>

            <div
              className="rounded-2xl border border-purple-500/20 p-4 text-xs leading-relaxed text-[#6B7394]"
              style={{
                background:
                  "linear-gradient(135deg, rgba(168, 85, 247, 0.05), rgba(6, 182, 212, 0.05))",
              }}
            >
              <div className="mb-2 text-sm font-bold text-[#3B4CCA]">
                환불 계산 과정
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between rounded-xl px-3 py-2 bg-white/50">
                  <span>내 잔액 (= 환불받을 금액)</span>
                  <span className="font-bold text-[#3B4CCA]">
                    {balance.toLocaleString()}P
                  </span>
                </div>
                <div className="flex items-center justify-between rounded-xl px-3 py-2 bg-[#10B981]/8">
                  <span>다랜드 시스템이 별도로 확보</span>
                  <span className="font-bold text-[#10B981]">
                    {refund.securedPool.toLocaleString()}P
                  </span>
                </div>
              </div>
              <div className="mt-3 rounded-xl bg-[#3B4CCA]/5 border border-[#3B4CCA]/20 px-3 py-2.5 text-xs text-[#1A1F36]">
                <strong className="text-[#3B4CCA]">내 환불금에서 차감되는 것은 없습니다.</strong><br />
                비선형공식이 별도로 {refund.rate}%({refund.securedPool.toLocaleString()}P)를 만들어내고, 그 중 내 잔액 전액({balance.toLocaleString()}P)이 환불됩니다. 나머지 {refund.systemProfit.toLocaleString()}P는 다랜드가 시스템 운영에 활용합니다.
              </div>
            </div>

            <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4 text-xs text-[#6B7394]">
              <div className="mb-1 font-bold text-amber-600">
                탈퇴 전 알아두세요
              </div>
              <ul className="list-disc pl-4 space-y-1">
                <li>
                  탈퇴 시 모든 거래내역과 적립 포인트가{" "}
                  <strong className="text-[#EF4444]">영구 삭제</strong>됩니다.
                </li>
                <li><strong className="text-[#10B981]">내 잔액 전액({balance.toLocaleString()}P)이 은행계좌로 환불</strong>됩니다.</li>
                <li>내 돈에서 빼가는 금액은 없습니다. 비선형공식이 별도로 추가 확보한 {refund.systemProfit.toLocaleString()}P만 다랜드 운영에 활용됩니다.</li>
                <li>탈퇴 후 같은 이메일로 재가입이 가능합니다.</li>
              </ul>
            </div>

            <button
              onClick={() => setStep("reason")}
              className="w-full rounded-2xl bg-[#EF4444] py-4 text-base font-bold text-white shadow-lg shadow-[#EF4444]/20 transition-transform hover:scale-[1.02] active:scale-95"
            >
              탈퇴 진행하기
            </button>
            <Link
              href="/dashboard"
              className="block w-full text-center text-sm text-[#6B7394] hover:text-[#1A1F36]"
            >
              돌아가기
            </Link>
          </div>
        )}

        {/* Step 2: 탈퇴 사유 */}
        {step === "reason" && (
          <div className="space-y-4">
            <div className="text-sm font-bold text-[#6B7394]">
              탈퇴 사유를 선택해주세요 (선택사항)
            </div>
            <div className="space-y-2">
              {REASONS.map((r) => (
                <button
                  key={r}
                  onClick={() => setSelectedReason(r)}
                  className="w-full rounded-xl border p-3 text-left text-sm transition-all"
                  style={{
                    borderColor:
                      selectedReason === r
                        ? "rgba(59, 76, 202, 0.5)"
                        : "var(--card-border)",
                    background:
                      selectedReason === r
                        ? "rgba(59, 76, 202, 0.06)"
                        : "var(--card-bg)",
                  }}
                >
                  {r}
                </button>
              ))}
            </div>
            {selectedReason === "기타" && (
              <textarea
                placeholder="사유를 입력해주세요"
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                className="dark-input w-full rounded-xl border border-[#E8EAF0] bg-white px-4 py-3 text-sm placeholder-[#9CA3C1] outline-none focus:border-[#3B4CCA]"
                rows={3}
              />
            )}
            <button
              onClick={() => setStep("confirm")}
              className="w-full rounded-2xl bg-[#EF4444] py-3 text-sm font-bold text-white"
            >
              다음
            </button>
            <button
              onClick={() => setStep("info")}
              className="w-full text-center text-sm text-[#6B7394]"
            >
              뒤로
            </button>
          </div>
        )}

        {/* Step 3: 최종 확인 */}
        {step === "confirm" && (
          <div className="space-y-4 text-center">
            <div className="text-5xl">⚠️</div>
            <div className="text-xl font-bold text-[#EF4444]">
              정말 탈퇴하시겠습니까?
            </div>
            <div
              className="rounded-2xl border border-[#EF4444]/20 p-5"
              style={{
                background:
                  "linear-gradient(135deg, rgba(239, 68, 68, 0.05), rgba(168, 85, 247, 0.05))",
              }}
            >
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-[#6B7394]">환불 금액</span>
                  <span className="font-bold text-[#3B4CCA]">
                    {refund.refundAmount.toLocaleString()}원
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#6B7394]">시스템 귀속</span>
                  <span className="font-bold text-[#EF4444]">
                    {refund.systemProfit.toLocaleString()}원
                  </span>
                </div>
                {reason && (
                  <div className="flex justify-between">
                    <span className="text-[#6B7394]">탈퇴 사유</span>
                    <span className="font-bold">{reason}</span>
                  </div>
                )}
              </div>
              <div className="mt-3 text-xs text-[#6B7394]">
                원금 {refund.refundAmount.toLocaleString()}P가 등록
                은행계좌로 환불됩니다.
              </div>
            </div>
            <button
              onClick={handleWithdraw}
              disabled={processing}
              className="w-full rounded-2xl bg-[#EF4444] py-4 text-base font-bold text-white shadow-lg shadow-[#EF4444]/20"
            >
              {processing ? "탈퇴 처리 중..." : "탈퇴 확정"}
            </button>
            <button
              onClick={() => setStep("reason")}
              disabled={processing}
              className="w-full text-center text-sm text-[#6B7394]"
            >
              뒤로
            </button>
          </div>
        )}

        {/* Step 4: 완료 */}
        {step === "complete" && (
          <div className="text-center space-y-4">
            <div className="text-5xl">👋</div>
            <div className="text-xl font-bold">탈퇴가 완료되었습니다</div>
            <div className="rounded-2xl border border-[#10B981]/20 bg-emerald-500/5 p-5">
              <div className="text-sm text-[#6B7394]">환불 예정 금액</div>
              <div className="mt-1 text-3xl font-black text-[#10B981]">
                {refund.refundAmount.toLocaleString()}원
              </div>
              <div className="mt-2 text-xs text-[#6B7394]">
                등록 은행계좌로 영업일 기준 1~2일 내 입금됩니다.
              </div>
            </div>
            <div className="rounded-xl bg-purple-900/10 border border-purple-500/20 p-3 text-xs text-[#6B7394]">
              <p>
                다랜드를 이용해 주셔서 감사합니다. 같은 이메일로 언제든 다시
                가입하실 수 있습니다.
              </p>
            </div>
            <Link
              href="/"
              className="block w-full rounded-xl border border-[#3B4CCA]/30 bg-[#3B4CCA]/8 py-3 text-sm font-bold text-[#3B4CCA] hover:bg-[#3B4CCA]/15"
            >
              로그인 화면으로
            </Link>
          </div>
        )}
      </div>

      {step !== "complete" && <Navbar />}
    </div>
  );
}
