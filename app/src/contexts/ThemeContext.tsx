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

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [isDark, setIsDark] = useState(true);
  const [fontSize, setFontSize] = useState(18); // base 18px (기존 16 + 4px 증가)

  useEffect(() => {
    const savedTheme = localStorage.getItem("daland-theme");
    const savedFontSize = localStorage.getItem("daland-fontsize");
    if (savedTheme) setIsDark(savedTheme === "dark");
    if (savedFontSize) setFontSize(Number(savedFontSize));
  }, []);

  useEffect(() => {
    localStorage.setItem("daland-theme", isDark ? "dark" : "light");
    document.documentElement.setAttribute("data-theme", isDark ? "dark" : "light");
  }, [isDark]);

  useEffect(() => {
    localStorage.setItem("daland-fontsize", String(fontSize));
    document.documentElement.style.fontSize = fontSize + "px";
  }, [fontSize]);

  const toggleTheme = () => setIsDark((p) => !p);
  const increaseFontSize = () => setFontSize((p) => Math.min(p + 2, 28));
  const decreaseFontSize = () => setFontSize((p) => Math.max(p - 2, 12));

  return (
    <ThemeContext.Provider value={{ isDark, toggleTheme, fontSize, increaseFontSize, decreaseFontSize }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
