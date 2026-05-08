"use client";

import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

const HIDE_ON_PATHS = ["/", "/dashboard"];

export default function BackButton() {
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useAuth();

  if (!user) return null;
  if (HIDE_ON_PATHS.includes(pathname)) return null;

  const handleBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      router.push("/dashboard");
    }
  };

  return (
    <button
      onClick={handleBack}
      className="fixed left-4 top-4 z-50 flex h-10 w-10 items-center justify-center rounded-xl shadow-lg transition-transform active:scale-90"
      style={{ background: "var(--header-bg)", border: "1px solid var(--card-border)" }}
      aria-label="뒤로 가기"
    >
      <span className="text-xl text-[#3B4CCA]">&larr;</span>
    </button>
  );
}
