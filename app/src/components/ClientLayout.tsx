"use client";

import { ReactNode } from "react";
import HamburgerMenu from "@/components/HamburgerMenu";
import FloatingControls from "@/components/FloatingControls";

export default function ClientLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <HamburgerMenu />
      {children}
      <FloatingControls />
    </>
  );
}
