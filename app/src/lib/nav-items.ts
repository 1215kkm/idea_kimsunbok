/**
 * 공용 네비게이션 항목 — 모바일 햄버거 메뉴(HamburgerMenu)와
 * PC 사이드바(DesktopSidebar)가 동일한 목록을 공유한다.
 */
export interface NavItem {
  href: string;
  label: string;
  icon: string;
  desc: string;
  admin: boolean;
  badge?: string;
}

export const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "홈", icon: "home", desc: "대시보드", admin: false },
  { href: "/deposit", label: "입금", icon: "savings", desc: "다랜드 내 계좌 충전", admin: false },
  { href: "/stores", label: "지출등록", icon: "credit_card", desc: "잔액 차감 + 120% 적립", admin: false },
  { href: "/card-connect", label: "카드 자동 연동", icon: "sync", desc: "정식 출시 시 오픈 예정", admin: false, badge: "준비중" },
  { href: "/withdraw", label: "출금", icon: "account_balance", desc: "다랜드 계좌 → 내 은행계좌", admin: false },
  { href: "/card", label: "비선형카드", icon: "badge", desc: "카드 잔액 & 충전데이터", admin: false },
  { href: "/history", label: "내역", icon: "list_alt", desc: "포인트 기록", admin: false },
  { href: "/store-dashboard", label: "멤버십 분배", icon: "swap_horiz", desc: "회원간 분배 현황", admin: false },
  { href: "/engine", label: "엔진 설명", icon: "settings", desc: "비선형공식 원리", admin: false },
  { href: "/advertiser", label: "광고주", icon: "business", desc: "광고주 120% 수익", admin: false },
  { href: "/advertiser/invite", label: "리워드 초대", icon: "card_giftcard", desc: "초대하고 +20,000P 수익", admin: false },
  { href: "/admin", label: "관리자", icon: "admin_panel_settings", desc: "시스템 관리 패널", admin: true },
  { href: "/account/leave", label: "회원 탈퇴", icon: "logout", desc: "탈퇴 및 환불", admin: false },
];
