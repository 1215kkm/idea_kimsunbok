"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";

interface ThemeContextType {
  isDark: boolean;
  toggleTheme: () => void;
  fontSize: number;
  increaseFontSize: () => void;
  decreaseFontSize: () => void;
}

const ThemeContext = createContext<ThemeContextType>({} as ThemeContextType);

const FONT_KEY = "daland-fontsize";
const DEFAULT_FONT_SIZE = 18;

function readSavedFontSize(): number {
  if (typeof window === "undefined") return DEFAULT_FONT_SIZE;
  try {
    const v = localStorage.getItem(FONT_KEY);
    const n = v ? Number(v) : DEFAULT_FONT_SIZE;
    return Number.isFinite(n) && n >= 12 && n <= 28 ? n : DEFAULT_FONT_SIZE;
  } catch {
    return DEFAULT_FONT_SIZE;
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  // 라이트 모드 고정 — 의뢰자 요청에 따라 다크 모드 비활성화
  const isDark = false;
  const [fontSize, setFontSize] = useState<number>(readSavedFontSize);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", "light");
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(FONT_KEY, String(fontSize));
    } catch {
      // quota 등 무시
    }
    document.documentElement.style.fontSize = fontSize + "px";
  }, [fontSize]);

  const toggleTheme = () => {
    // no-op: 라이트 모드 고정
  };
  const increaseFontSize = () => setFontSize((p) => Math.min(p + 2, 28));
  const decreaseFontSize = () => setFontSize((p) => Math.max(p - 2, 12));

  return (
    <ThemeContext.Provider value={{ isDark, toggleTheme, fontSize, increaseFontSize, decreaseFontSize }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
