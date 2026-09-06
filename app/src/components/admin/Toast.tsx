"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import AdminIcon from "./AdminIcon";

interface ToastState {
  message: string;
  isError: boolean;
  show: boolean;
}

type ToastFn = (message: string, isError?: boolean) => void;

const ToastContext = createContext<ToastFn>(() => {});

export function useToast(): ToastFn {
  return useContext(ToastContext);
}

/** 우하단 토스트 — 2.4초 자동 닫힘. 에러는 아이콘만 빨강. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ToastState>({ message: "", isError: false, show: false });
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const toast = useCallback<ToastFn>((message, isError = false) => {
    if (timer.current) clearTimeout(timer.current);
    setState({ message, isError, show: true });
    timer.current = setTimeout(() => setState((s) => ({ ...s, show: false })), 2400);
  }, []);

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className={`ad-toast ${state.isError ? "error" : ""} ${state.show ? "show" : ""}`.trim()} role="status" aria-live="polite">
        <AdminIcon name={state.isError ? "alert" : "check"} />
        <span>{state.message}</span>
      </div>
    </ToastContext.Provider>
  );
}
