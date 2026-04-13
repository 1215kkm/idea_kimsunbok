"use client";

import { ReactNode } from "react";
import HamburgerMenu from "@/components/HamburgerMenu";
import FloatingControls from "@/components/FloatingControls";
import FeedbackButton from "@/components/FeedbackButton";

export default function ClientLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <HamburgerMenu />
      {children}
      <FloatingControls />
      <FeedbackButton />
    </>
  );
}
