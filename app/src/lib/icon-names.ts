/**
 * 자체 호스팅 서브셋 폰트(public/fonts/material-symbols-subset.woff2)에 실제로 들어 있는
 * 아이콘 이름 목록.
 *
 * 서브셋에 없는 이름을 쓰면 아이콘 대신 그 이름이 글자로 화면에 노출된다.
 * 그 사고를 빌드 단계에서 잡으려고 유니온 타입으로 고정해 둔다 — <Icon name="..."> 이
 * 이 목록 밖의 값이면 `npm run build` 가 실패한다.
 *
 * 새 아이콘을 쓰려면:
 *   1) scripts/build-icon-font.py 의 ICONS 에 추가
 *   2) python3 scripts/build-icon-font.py 실행 (폰트 재생성)
 *   3) 아래 목록에 추가
 */
export const SUBSET_ICONS = [
  "account_balance",
  "add_circle",
  "admin_panel_settings",
  "badge",
  "check",
  "close",
  "credit_card",
  "description",
  "expand_less",
  "expand_more",
  "home",
  "list_alt",
  "login",
  "logout",
  "notifications",
  "person",
  "person_add",
  "redeem",
  "savings",
  "settings",
  "swap_horiz",
  "sync",
] as const;

export type IconName = (typeof SUBSET_ICONS)[number];
