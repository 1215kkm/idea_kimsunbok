"use client";

import { useState } from "react";
import { useTheme } from "@/contexts/ThemeContext";

export default function FloatingControls() {
  const { isDark, toggleTheme, fontSize, increaseFontSize, decreaseFontSize } = useTheme();
  const [open, setOpen] = useState(false);

  return (
    <div className="fixed bottom-20 right-4 z-40 flex flex-col items-end gap-2">
      {/* 펼쳐진 컨트롤들 */}
      {open && (
        <div className="flex flex-col gap-2 animate-in slide-in-from-bottom-2">
          {/* 라이트/다크 모드 토글 */}
          <button
            onClick={toggleTheme}
            className="flex h-12 w-12 items-center justify-center rounded-full shadow-lg transition-transform active:scale-90"
            style={{
              background: isDark
                ? "linear-gradient(135deg, #f59e0b, #f97316)"
                : "linear-gradient(135deg, #6366f1, #8b5cf6)",
            }}
            title={isDark ? "라이트 모드" : "다크 모드"}
          >
            <span className="text-xl">{isDark ? "☀️" : "🌙"}</span>
          </button>

          {/* 글자 키우기 */}
          <button
            onClick={increaseFontSize}
            disabled={fontSize >= 28}
            className="flex h-12 w-12 items-center justify-center rounded-full bg-[#10B981] text-white text-lg font-black shadow-lg transition-transform active:scale-90 disabled:opacity-30"
            title="글자 크게"
          >
            A+
          </button>

          {/* 글자 줄이기 */}
          <button
            onClick={decreaseFontSize}
            disabled={fontSize <= 12}
            className="flex h-12 w-12 items-center justify-center rounded-full bg-[#EF4444] text-white text-sm font-black shadow-lg transition-transform active:scale-90 disabled:opacity-30"
            title="글자 작게"
          >
            A-
          </button>

          {/* 현재 크기 표시 */}
          <div className="flex h-8 items-center justify-center rounded-full bg-[#1A1F36]/60 px-3 text-xs text-white backdrop-blur-sm">
            {fontSize}px
          </div>
        </div>
      )}

      {/* 메인 토글 버튼 */}
      <button
        onClick={() => setOpen(!open)}
        className="flex h-14 w-14 items-center justify-center rounded-full bg-[#3B4CCA] text-white shadow-xl shadow-[#3B4CCA]/15 transition-all active:scale-90"
        style={{ transform: open ? "rotate(45deg)" : "rotate(0deg)", transition: "transform 0.3s" }}
      >
        <span className="text-2xl font-bold">+</span>
      </button>
    </div>
  );
}
