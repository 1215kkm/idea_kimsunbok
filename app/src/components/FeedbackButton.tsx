"use client";

import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";

// 피드백 수신 이메일 (배포 전 교체 가능)
const FEEDBACK_EMAIL = "feedback@dataland.kr";

export default function FeedbackButton() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [sent, setSent] = useState(false);

  // 로그인 안 했을 땐 숨김
  if (!user) return null;

  const submit = () => {
    if (!text.trim()) return;

    // 1) localStorage에도 저장 (유실 방지)
    try {
      const key = "daland-feedback-log";
      const raw = localStorage.getItem(key);
      const list = raw ? JSON.parse(raw) : [];
      list.push({
        email: user.email,
        name: user.displayName,
        text,
        createdAt: Date.now(),
        path: typeof window !== "undefined" ? window.location.pathname : "",
      });
      localStorage.setItem(key, JSON.stringify(list));
    } catch {
      // 저장 실패 무시
    }

    // 2) 메일 앱 열기 (본인 이메일 앱으로 전송)
    const subject = encodeURIComponent("[다랜드 베타] 피드백");
    const body = encodeURIComponent(
      `사용자: ${user.displayName || "익명"} <${user.email || ""}>\n` +
        `페이지: ${typeof window !== "undefined" ? window.location.pathname : ""}\n` +
        `일시: ${new Date().toLocaleString("ko-KR")}\n\n` +
        `--- 피드백 ---\n${text}\n`
    );
    if (typeof window !== "undefined") {
      window.location.href = `mailto:${FEEDBACK_EMAIL}?subject=${subject}&body=${body}`;
    }

    setSent(true);
    setText("");
  };

  const close = () => {
    setOpen(false);
    setSent(false);
    setText("");
  };

  return (
    <>
      {/* 토글 버튼 (좌측 하단) */}
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-20 left-4 z-40 flex items-center gap-1.5 rounded-full border border-[#E8EAF0] bg-white px-3 py-2 text-xs font-bold text-[#3B4CCA] shadow-lg transition-transform active:scale-95 hover:border-[#3B4CCA]/30"
        title="베타 피드백 보내기"
      >
        <span>💬</span>
        <span>피드백</span>
      </button>

      {/* 모달 */}
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 px-4 pb-6 backdrop-blur-sm sm:items-center sm:pb-0"
          onClick={close}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-[#E8EAF0] bg-white p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {!sent ? (
              <>
                <div className="mb-3 flex items-center gap-2">
                  <span className="text-xl">💬</span>
                  <h2 className="text-base font-bold text-[#1A1F36]">베타 피드백</h2>
                </div>
                <p className="mb-3 text-xs text-[#6B7394]">
                  사용하면서 느낀 점, 버그, 개선 아이디어를 자유롭게 남겨주세요.
                  전송 시 메일 앱이 열립니다.
                </p>
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  rows={6}
                  placeholder="예) 지출 등록 후 포인트 계산이 직관적이지 않아요. 120%가 어떻게 나오는지 설명이 더 있으면 좋겠어요."
                  className="w-full rounded-xl border border-[#E8EAF0] bg-white px-3 py-2 text-sm placeholder-[#9CA3C1] outline-none focus:border-[#3B4CCA]"
                />
                <div className="mt-3 flex gap-2">
                  <button
                    onClick={close}
                    className="flex-1 rounded-xl border border-[#E8EAF0] bg-white py-2.5 text-sm font-medium text-[#6B7394] hover:bg-[#F7F8FC]"
                  >
                    취소
                  </button>
                  <button
                    onClick={submit}
                    disabled={!text.trim()}
                    className="flex-1 rounded-xl bg-[#FFB800] py-2.5 text-sm font-bold text-[#1A1F36] disabled:opacity-50"
                  >
                    메일로 전송
                  </button>
                </div>
              </>
            ) : (
              <div className="py-4 text-center">
                <div className="text-4xl">✅</div>
                <div className="mt-2 text-base font-bold text-[#1A1F36]">감사합니다!</div>
                <p className="mt-1 text-xs text-[#6B7394]">
                  메일 앱이 열렸다면 전송 버튼을 눌러주세요. 피드백은 이 브라우저에도 보관됩니다.
                </p>
                <button
                  onClick={close}
                  className="mt-4 rounded-xl bg-[#3B4CCA] px-6 py-2 text-sm font-bold text-white"
                >
                  닫기
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
