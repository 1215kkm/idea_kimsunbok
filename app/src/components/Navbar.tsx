"use client";

import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { usePathname } from "next/navigation";

export default function Navbar() {
  const { user, signOut } = useAuth();
  const pathname = usePathname();

  if (!user) return null;

  const links = [
    { href: "/dashboard", label: "홈", icon: "🏠" },
    { href: "/stores", label: "지출등록", icon: "💳" },
    { href: "/withdraw", label: "출금", icon: "🏦" },
    { href: "/history", label: "내역", icon: "📋" },
  ];

  return (
    <nav className="dark-navbar fixed bottom-0 left-0 right-0 z-50 border-t border-[#E8EAF0] bg-white/95 backdrop-blur-md">
      <div className="mx-auto flex max-w-md items-center justify-around py-2">
        {links.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className={`flex flex-col items-center gap-0.5 px-4 py-1 text-xs transition-colors ${
              pathname === l.href
                ? "text-[#3B4CCA] font-bold"
                : "text-[#6B7394] hover:text-[#3B4CCA]"
            }`}
          >
            <span className="text-xl">{l.icon}</span>
            {l.label}
          </Link>
        ))}
        <button
          onClick={signOut}
          className="flex flex-col items-center gap-0.5 px-4 py-1 text-xs text-[#6B7394] hover:text-[#3B4CCA]"
        >
          <span className="text-xl">👋</span>
          로그아웃
        </button>
      </div>
    </nav>
  );
}
