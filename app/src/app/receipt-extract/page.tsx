"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect, useState, useRef, useCallback } from "react";
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
  { storeName: "OO식당", amount: 12000, date: "2026-03-10", category: "식자재", paymentMethod: "신용카드" },
  { storeName: "GS주유소", amount: 65000, date: "2026-03-10", category: "주유비", paymentMethod: "신용카드" },
  { storeName: "OO마트", amount: 45000, date: "2026-03-09", category: "생활비", paymentMethod: "현금카드" },
];

// Web Audio API로 신호음 생성
function playSignalSound() {
  try {
    const ctx = new AudioContext();
    // 짧은 상승 신호음 (삐-빕!)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.frequency.setValueAtTime(800, ctx.currentTime);
    osc1.frequency.setValueAtTime(1200, ctx.currentTime + 0.1);
    gain1.gain.setValueAtTime(0.3, ctx.currentTime);
    gain1.gain.setValueAtTime(0, ctx.currentTime + 0.2);
    osc1.start(ctx.currentTime);
    osc1.stop(ctx.currentTime + 0.2);

    // 두 번째 높은 음
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.frequency.setValueAtTime(1400, ctx.currentTime + 0.25);
    gain2.gain.setValueAtTime(0.3, ctx.currentTime + 0.25);
    gain2.gain.setValueAtTime(0, ctx.currentTime + 0.5);
    osc2.start(ctx.currentTime + 0.25);
    osc2.stop(ctx.currentTime + 0.5);
  } catch {
    // AudioContext 미지원 환경
  }
}

// TTS 음성 알림
function speakAccumulation(category: string, amount: number, earned: number) {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const msg = new SpeechSynthesisUtterance(
    `${category} ${amount.toLocaleString()}원에 ${earned.toLocaleString()}포인트, 120% 적립되었습니다.`
  );
  msg.lang = "ko-KR";
  msg.rate = 1.1;
  msg.pitch = 1.0;
  // 한국어 음성 찾기
  const voices = window.speechSynthesis.getVoices();
  const koVoice = voices.find((v) => v.lang.startsWith("ko"));
  if (koVoice) msg.voice = koVoice;
  window.speechSynthesis.speak(msg);
}

// OCR 시뮬레이션: 카메라에서 텍스트를 "추출"하는 애니메이션용 텍스트
const OCR_LINES = [
  "상호: OO식당",
  "결제금액: 12,000원",
  "결제수단: 신용카드",
  "일시: 2026.03.10 12:34",
  "---OCR 판독 완료---",
];

export default function ReceiptExtractPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [mode, setMode] = useState<"select" | "camera" | "ocr-scanning" | "ocr-result" | "auto" | "auto-scanning" | "list">("select");
  const [ocrLines, setOcrLines] = useState<string[]>([]);
  const [extractedReceipts, setExtractedReceipts] = useState<ReceiptData[]>([]);
  const [processedIndex, setProcessedIndex] = useState(-1);
  const [results, setResults] = useState<Array<{ receipt: ReceiptData; earned: number }>>([]);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) router.push("/");
  }, [user, loading, router]);

  // 음성 목록 로드
  useEffect(() => {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.getVoices();
    }
  }, []);

  // 카메라 정리
  useEffect(() => {
    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach((t) => t.stop());
      }
    };
  }, [cameraStream]);

  // 카메라 열기
  const openCamera = useCallback(async () => {
    setMode("camera");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      setCameraStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch {
      // 카메라 권한 거부 → 데모 모드로 전환
      setMode("ocr-scanning");
      simulateOCR();
    }
  }, []);

  // 사진 촬영
  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const canvas = canvasRef.current;
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0);
        const imageData = canvas.toDataURL("image/jpeg");
        setCapturedImage(imageData);
      }
    }
    // 카메라 종료
    if (cameraStream) {
      cameraStream.getTracks().forEach((t) => t.stop());
      setCameraStream(null);
    }
    // OCR 시뮬레이션 시작
    setMode("ocr-scanning");
    simulateOCR();
  };

  // OCR 시뮬레이션 (한 줄씩 추출)
  const simulateOCR = () => {
    setOcrLines([]);
    OCR_LINES.forEach((line, i) => {
      setTimeout(() => {
        setOcrLines((prev) => [...prev, line]);
        if (i === OCR_LINES.length - 1) {
          setTimeout(() => {
            setMode("ocr-result");
            setExtractedReceipts([DEMO_RECEIPTS[0]]);
          }, 800);
        }
      }, (i + 1) * 600);
    });
  };

  // CMS 자동인식 모드
  const startAutoMode = () => {
    setMode("auto-scanning");
    setTimeout(() => {
      setExtractedReceipts(DEMO_RECEIPTS);
      setMode("list");
    }, 2500);
  };

  // 영수증 처리 (비선형공식 적용 + 신호음 + 음성)
  const processReceipt = (index: number) => {
    const receipt = extractedReceipts[index];
    const nlResult = calculateNonlinear(receipt.amount);
    setProcessedIndex(index);

    setTimeout(() => {
      setResults((prev) => [...prev, { receipt, earned: nlResult.totalAccumulation }]);
      setProcessedIndex(-1);

      // 신호음
      playSignalSound();

      // TTS 음성 알림
      if (voiceEnabled) {
        setTimeout(() => {
          speakAccumulation(receipt.category, receipt.amount, nlResult.totalAccumulation);
        }, 600);
      }
    }, 1500);
  };

  // 전체 처리
  const processAll = () => {
    extractedReceipts.forEach((_, i) => {
      if (results.find((r) => r.receipt === extractedReceipts[i])) return;
      setTimeout(() => {
        processReceipt(i);
      }, i * 2500);
    });
  };

  // OCR 결과에서 목록으로 전환
  const goToList = () => {
    setMode("list");
  };

  if (loading || !user) {
    return <div className="flex min-h-screen items-center justify-center text-zinc-500">로딩 중...</div>;
  }

  return (
    <div className="min-h-screen pb-20">
      {/* 헤더 */}
      <div className="dark-header border-b border-purple-900/20 bg-[#0d0d30]/80 px-5 py-4 pl-16">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold">영수증 자동 추출 모드</h1>
            <p className="text-xs text-zinc-500">OCR 광학식 문자 판독 & CMS 자동인식</p>
          </div>
          {/* 음성 모드 토글 */}
          <button
            onClick={() => setVoiceEnabled(!voiceEnabled)}
            className="flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px]"
            style={{
              borderColor: voiceEnabled ? "rgba(16, 185, 129, 0.4)" : "rgba(255,255,255,0.1)",
              background: voiceEnabled ? "rgba(16, 185, 129, 0.1)" : "transparent",
              color: voiceEnabled ? "#10b981" : "#71717a",
            }}
          >
            {voiceEnabled ? "🔊 음성 ON" : "🔇 음성 OFF"}
          </button>
        </div>
      </div>

      <div className="mx-auto max-w-lg px-5 py-6">
        {/* 접근성 안내 */}
        <div className="mb-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3 text-xs text-zinc-400">
          <span className="text-emerald-400 font-bold">♿ 접근성:</span> 시각장애인/중증장애인을 위해 적립 시 <strong className="text-white">신호음 + 음성</strong>으로 &quot;{"{"}금액{"}"} 120% 적립되었습니다&quot; 알려드립니다. 음성 ON/OFF 전환 가능.
        </div>

        {/* 모드 선택 */}
        {mode === "select" && (
          <div>
            <div className="mb-4 rounded-2xl border border-cyan-500/20 p-4"
              style={{ background: "linear-gradient(135deg, rgba(6, 182, 212, 0.08), rgba(168, 85, 247, 0.08))" }}>
              <div className="text-sm font-bold text-cyan-400 mb-2">추출 방식 선택</div>
              <p className="text-xs text-zinc-400 leading-relaxed">
                OCR 광학식 문자 판독으로 기계가 읽을 수 있는 음성인식으로 변환하여 최대한 자동모드로 처리합니다.
              </p>
            </div>

            {/* 방식 1: 카메라 OCR */}
            <button
              onClick={openCamera}
              className="mb-3 w-full rounded-2xl border border-purple-500/30 bg-[#14143c] p-5 text-left transition-all hover:border-purple-500/50 active:scale-[0.98]"
            >
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-purple-900/30 text-3xl">
                  📷
                </div>
                <div className="flex-1">
                  <div className="text-sm font-bold">영수증 촬영 (OCR)</div>
                  <div className="text-xs text-zinc-500 mt-1">카메라로 영수증을 촬영하면 OCR 광학식 문자 판독으로 금액을 자동 추출합니다.</div>
                </div>
              </div>
            </button>

            {/* 방식 2: CMS 자동인식 */}
            <button
              onClick={startAutoMode}
              className="mb-3 w-full rounded-2xl border border-cyan-500/30 bg-[#14143c] p-5 text-left transition-all hover:border-cyan-500/50 active:scale-[0.98]"
            >
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-cyan-900/30 text-3xl">
                  🔄
                </div>
                <div className="flex-1">
                  <div className="text-sm font-bold">CMS 자동인식</div>
                  <div className="text-xs text-zinc-500 mt-1">신용카드 결제 후 CMS가 자동으로 영수증 금액을 추출합니다. 단말기(스마트폰) & 은행결제계좌 연동.</div>
                </div>
              </div>
            </button>

            {/* 방식 3: 직접 입력 (가계부) */}
            <button
              onClick={() => router.push("/stores")}
              className="w-full rounded-2xl border border-zinc-800 bg-[#14143c] p-5 text-left transition-all hover:border-zinc-600 active:scale-[0.98]"
            >
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-zinc-800/50 text-3xl">
                  ✍️
                </div>
                <div className="flex-1">
                  <div className="text-sm font-bold">직접 입력 (가계부)</div>
                  <div className="text-xs text-zinc-500 mt-1">지출데이터를 직접 등록합니다. 마이데이터 허가 불필요 - 단순 가계부 방식.</div>
                </div>
              </div>
            </button>

            {/* 안내 */}
            <div className="mt-4 rounded-xl border border-zinc-800 p-3 text-[10px] text-zinc-600 leading-relaxed">
              <p>* 본 서비스는 개인신용정보를 저장·접근하지 않는 단순 가계부 어플입니다.</p>
              <p>* BM특허 &quot;디지털데이터플랫폼&quot; - 소비자가 데이터의 주권을 행사합니다.</p>
              <p>* 사업자등록번호: 129-38-00357 / 대표자: 김순복</p>
            </div>
          </div>
        )}

        {/* 카메라 모드 */}
        {mode === "camera" && (
          <div className="text-center">
            <div className="relative overflow-hidden rounded-2xl border border-purple-500/30 bg-black">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full"
                style={{ minHeight: 300 }}
              />
              {/* 스캔 가이드 오버레이 */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="h-48 w-72 rounded-lg border-2 border-dashed border-cyan-400/50" />
              </div>
              <div className="absolute bottom-3 left-0 right-0 text-center text-xs text-cyan-400">
                영수증을 가이드 안에 맞춰주세요
              </div>
            </div>
            <canvas ref={canvasRef} className="hidden" />
            <button
              onClick={capturePhoto}
              className="mt-4 w-full rounded-xl bg-gradient-to-r from-purple-600 to-cyan-500 py-4 text-sm font-bold text-white"
            >
              📷 촬영하기
            </button>
            <button
              onClick={() => { setMode("select"); if (cameraStream) { cameraStream.getTracks().forEach((t) => t.stop()); setCameraStream(null); } }}
              className="mt-2 w-full text-sm text-zinc-500"
            >
              취소
            </button>
          </div>
        )}

        {/* OCR 스캔 중 */}
        {mode === "ocr-scanning" && (
          <div>
            {/* 캡처 이미지 */}
            {capturedImage && (
              <div className="mb-4 overflow-hidden rounded-2xl border border-purple-500/30">
                <img src={capturedImage} alt="촬영된 영수증" className="w-full opacity-60" />
              </div>
            )}

            <div className="rounded-2xl border border-cyan-500/30 bg-[#14143c] p-5">
              <div className="flex items-center gap-2 text-sm font-bold text-cyan-400 mb-3">
                <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-cyan-400 border-t-transparent" />
                OCR 광학식 문자 판독 중...
              </div>
              <div className="space-y-1.5 font-mono text-xs">
                {ocrLines.map((line, i) => (
                  <div
                    key={i}
                    className="rounded bg-black/30 px-3 py-1.5 text-emerald-400"
                    style={{ animation: "fadeIn 0.3s ease" }}
                  >
                    {line}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* OCR 결과 */}
        {mode === "ocr-result" && extractedReceipts.length > 0 && (
          <div>
            <div className="text-center mb-4">
              <div className="text-4xl mb-2">✅</div>
              <div className="text-sm font-bold text-emerald-400">OCR 판독 완료</div>
              <div className="text-xs text-zinc-500">영수증에서 다음 정보를 추출했습니다</div>
            </div>

            <div className="rounded-2xl border border-emerald-500/30 bg-[#14143c] p-4 space-y-2">
              {[
                { label: "상호명", value: extractedReceipts[0].storeName },
                { label: "결제금액", value: `${extractedReceipts[0].amount.toLocaleString()}원` },
                { label: "결제수단", value: extractedReceipts[0].paymentMethod },
                { label: "분류", value: extractedReceipts[0].category },
                { label: "날짜", value: extractedReceipts[0].date },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between text-sm">
                  <span className="text-zinc-500">{label}</span>
                  <span className="font-bold text-white">{value}</span>
                </div>
              ))}
            </div>

            {/* 미리보기: 120% */}
            <div className="mt-3 rounded-xl bg-purple-900/20 border border-purple-500/20 p-3 text-center">
              <div className="text-xs text-zinc-500">비선형공식 적용 시</div>
              <div className="text-2xl font-black text-emerald-400 mt-1">
                +{Math.round(extractedReceipts[0].amount * 1.2).toLocaleString()}P
              </div>
              <div className="text-xs text-purple-400 mt-1">120% 증액 적립</div>
            </div>

            <div className="mt-4 flex gap-2">
              <button
                onClick={() => { processReceipt(0); goToList(); }}
                className="flex-1 rounded-xl bg-gradient-to-r from-purple-600 to-cyan-500 py-3 text-sm font-bold text-white"
              >
                차감 & 120% 적립 실행
              </button>
              <button
                onClick={() => setMode("select")}
                className="rounded-xl border border-zinc-700 px-4 py-3 text-sm text-zinc-400"
              >
                다시
              </button>
            </div>
          </div>
        )}

        {/* CMS 자동인식 스캔 중 */}
        {mode === "auto-scanning" && (
          <div className="rounded-2xl border border-cyan-500/30 bg-[#14143c] p-6 text-center">
            <div className="text-4xl mb-3 animate-pulse">🔄</div>
            <div className="text-sm font-bold text-cyan-400">CMS 자동인식 중...</div>
            <div className="mt-2 text-xs text-zinc-500">단말기(스마트폰) & 은행결제계좌에서<br />영수증 금액을 자동 추출하고 있습니다</div>
            <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-zinc-800">
              <div className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-purple-500 animate-pulse" style={{ width: "70%" }} />
            </div>
          </div>
        )}

        {/* 추출된 영수증 목록 */}
        {mode === "list" && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="text-xs font-bold text-emerald-400">
                {extractedReceipts.length}건 영수증 추출 완료
              </div>
              <div className="flex gap-2">
                {results.length < extractedReceipts.length && (
                  <button
                    onClick={processAll}
                    className="rounded-full bg-purple-600 px-3 py-1 text-[10px] font-bold text-white"
                  >
                    전체 처리
                  </button>
                )}
                <button
                  onClick={() => { setMode("select"); setResults([]); setExtractedReceipts([]); setCapturedImage(null); }}
                  className="rounded-full border border-zinc-700 px-3 py-1 text-[10px] text-zinc-400"
                >
                  새로 추출
                </button>
              </div>
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
                      <div className="mt-2 flex items-center gap-2 text-[10px] text-zinc-500">
                        <span className="text-emerald-400">🔊</span>
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

                {/* 음성 알림 안내 */}
                <div className="mt-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-2 text-[10px] text-zinc-500">
                  {voiceEnabled
                    ? "🔊 적립 시 신호음과 함께 문자 & 소리로 알려드렸습니다"
                    : "🔇 음성 알림이 꺼져 있습니다. 상단 버튼으로 켜세요"}
                </div>

                {/* 펀드존 안내 */}
                <div className="mt-3 rounded-xl border border-purple-500/20 bg-purple-900/10 p-3 text-xs text-zinc-400 text-left">
                  <div className="text-purple-400 font-bold mb-1">멤버십 : 펀드존 : 120%</div>
                  <p>100% : 지출원금 + 20% : 증액 = 120%</p>
                  <p className="mt-1">1초에 20%를 적립하므로</p>
                  <p className="mt-1">적립 우선순위: <span className="text-cyan-400">은행 → 보험사 → 신용카드사 → 사업주</span> (단위 1억 이상) → 소비자 적립</p>
                </div>

                {/* 광고효과 안내 */}
                <div className="mt-2 rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 text-xs text-zinc-400 text-left">
                  <div className="text-amber-400 font-bold mb-1">📣 광고효과</div>
                  <p>결제 직후 바로 신호음과 함께 문자 & 소리로</p>
                  <p>&quot;식사비 120%(free) 적립되었습니다&quot;</p>
                  <p className="mt-1">스마트폰으로 알려주면 광고효과는 엄청나게 됩니다.</p>
                  <p className="mt-1 text-zinc-500">국내외 글로벌 지역: 숙박비, 식사, 항공 등 모두 적용</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <Navbar />

      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(5px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
