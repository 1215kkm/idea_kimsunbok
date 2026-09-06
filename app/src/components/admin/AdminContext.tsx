"use client";

import { createContext, useContext } from "react";

export interface AdminBadges {
  pendingCampaigns: number;
  pendingWithdrawals: number;
}

export interface AdminContextValue {
  mode: "live" | "demo";
  adminName: string;
  badges: AdminBadges;
  refreshBadges: () => void;
}

/** app/admin/layout.tsx 가 채우고, 하위 페이지가 useAdmin() 으로 읽는다. */
export const AdminContext = createContext<AdminContextValue>({
  mode: "demo",
  adminName: "",
  badges: { pendingCampaigns: 0, pendingWithdrawals: 0 },
  refreshBadges: () => {},
});

export const useAdmin = () => useContext(AdminContext);
