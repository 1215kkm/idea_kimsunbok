"use client";

import { ReactNode } from "react";
import HamburgerMenu from "@/components/HamburgerMenu";

export default function ClientLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <HamburgerMenu />
      {children}
    </>
  );
}
