"use client";

import { ReactNode } from "react";
import HamburgerMenu from "@/components/HamburgerMenu";
import BackButton from "@/components/BackButton";

export default function ClientLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <BackButton />
      <HamburgerMenu />
      {children}
    </>
  );
}
