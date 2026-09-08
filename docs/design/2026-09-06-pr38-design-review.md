# PR #38 관리자 화면 디자인 검수 — 강디

- 기준: `docs/mockups/admin-mockup.html` (A 네이비 확정) + CEO UX 7원칙 + 활성 스타일 #1 Crowny Class (구조 토큰)
- 대상: 워크트리 `agent-a04f72f2f5c953e17` `app/src/app/admin/*`, `app/src/components/admin/*`
- 검수일: 2026-09-08 (읽기 전용 — 코드 수정 없음)

## 판정: **수정 후 승인** — 필수 3건 (폰트 토큰 · `warn` 톤 CSS 누락 · 입력 disabled 상태). 흐름·컴포넌트 분해·색 규율은 목업대로 잘 옮겨졌음.

---

## 수정 필수 (머지 전)

| # | 파일:행 | 무엇 | 어떻게 |
|---|---|---|---|
| 1 | `admin.css:52-58` | `--ad-font-xs 12 / sm 13 / md 15 / lg 17 / xl 19 / 2xl 24 / 3xl 30` — **16px 아래 3단**. 목업 토큰(`admin-mockup.html:45`)은 `xs=sm=md=16 / lg 18 / xl 20 / 2xl 26 / 3xl 32`. 강팀 절대 금기 "폰트 < 16px" 위반. 캡션·배지·칩·`.ad-sub`·`.ad-note`·`.ad-src`·모달 글자수 카운터가 전부 12~13px로 나감 | 7개 값을 목업 스케일로 교체 (`16/16/16/18/20/26/32`). 나머지 코드는 토큰만 쓰고 있어 이 한 줄 교체로 끝. `html{font-size:21px}` 와 독립인 px 토큰 구조 자체는 맞음 |
| 2 | `ledger/page.tsx:77,81,82` → `admin.css:292-296` | 정합식 항목에 `tone: "warn"` (카드 실지출 발행 · type 없는 구 거래 · 집계 규칙 없는 유형) 을 붙였는데 `.ad-term.warn` 셀렉터가 CSS에 없음 → 경고 항이 일반 항과 똑같이 보임. 원칙 1(상태는 눈으로) 위반 — 관리자가 "설명 안 되는 항"을 못 알아봄 | `.ad-term.warn { border-color: var(--ad-warning); background: var(--ad-warning-light); } .ad-term.warn .ad-value { color: var(--ad-chip-orange-text); }` 추가 (목업 `.term.beta` 패턴과 동일 구조, 색만 warning 쌍) |
| 3 | `admin.css:347-352` | `.ad-input` 에 disabled 상태 없음. 드로어 "일일 지급 상한" 입력이 종료·거절 캠페인에서 `disabled` 인데 (`reward/page.tsx:369`) 활성 입력과 같은 모양 → 왜 안 써지는지 추측하게 됨 | `.ad-input:disabled { background: var(--ad-gray-bg); color: var(--text-muted); cursor: not-allowed; }` 추가. 플레이북 §4 입력 상태 매트릭스(기본/포커스/채움/에러/비활성/읽기전용) 중 비활성 빈칸 채우기 |

## 권장 (머지 후 가능)

- **햄버거 위치** — `layout.tsx:184,194-200` 이 본문 상단에 별도 블록으로 두어 ≤1024 에서 제목 위에 한 줄을 통째로 먹음. 목업(`admin-mockup.html:493-500`)은 h1 왼쪽 인라인. `PageHeader` 가 `AdminContext` 에서 `openSidebar` 를 받아 제목 옆에 그리고, 레이아웃 것은 헤더 없는 페이지 전용 폴백으로 남기면 됨 (강개발 추정 30분 — 동의).
- **다크 테마 누수** — 앱에 `[data-theme="dark"]` 가 있음 (`globals.css:59`). 관리자는 `--foreground/--background/--card-bg` 는 앱 변수를 따르지만 `--ad-hover #F9FAFB · --ad-border #E8EAF0 · --ad-gray-bg #F3F4F6 · --ad-primary-rgb 59,76,202` 는 라이트 고정이라 다크 전환 시 흰 hover 줄·연한 보더가 어두운 카드 위에 뜸. P0 에서는 `/admin` 진입 시 라이트 강제(ThemeContext) 한 줄이 가장 싸고, P1 에서 `--ad-*` 도 테마별 재선언.
- **`--ad-border: #E8EAF0`** 는 `globals.css:55 --divider` 와 같은 값 → `var(--divider)` 로 참조하면 앱과 한 소스. `--ad-primary-rgb` 도 다크에서 `--primary` 가 `#7B8AE6` 로 바뀌므로 위 항목과 함께.
- **대시보드에 `/admin/ledger` 진입 버튼 2개** (`page.tsx:191 "상세 보기"`, `page.tsx:248 "총량 검산에서 원인 보기"`) — 목업이 그렇게 그려서 구현이 따른 것. 원칙 4 기준으로는 하나만 남기는 게 맞음 (정합 상태 카드의 그라데이션 CTA 유지, 총량 검산 카드의 "상세 보기" 제거). 제 목업 탓이라 권장으로 둠.
- **드로어 탭 라벨 `지급내역 (N)`** (`reward/page.tsx:383`) — 로드 후 숫자가 붙으면서 옆 탭이 몇 px 밀림 (원칙 3). `min-width` 를 주거나 숫자를 `.ad-n` 칩으로 고정폭 처리.
- **Suspense/권한 확인 폴백** (`reward:50`, `members:30`, `withdrawals:26`, `layout:110`) 이 "불러오는 중..." 텍스트 한 줄 — 본문은 스켈레톤인데 첫 진입만 텍스트라 두 가지 로딩 언어. KPI 4칸 스켈레톤 껍데기로 통일 권장.
- `ledger/page.tsx:143` `fmtP(t.op === "−" ? t.value : t.value)` — 양쪽 같은 값, 의도 없는 삼항 (강개발 정리용).

---

## 검수 항목별

**1. 색** — `admin.css` HEX 는 전부 `.ad-root` 토큰 선언부(9-33행)에만 있고 규칙 본문·tsx 인라인 HEX 0건. 브랜드색은 `var(--primary)`·`var(--primary-light)`·`var(--danger)`·`var(--success)`·`var(--text-muted)` 참조 ✓. 신설 `--ad-*` 는 목업 토큰과 값 동일 ✓. 흰 글자는 그라데이션(btn-primary·fchip.active·preview)·다크(toast)·danger(dot·btn-danger:hover) 위에만 ✓. 아웃라인/세컨더리 버튼 loading 스피너 색 분기(159행)까지 챙김 ✓. 골드 `--accent` 미사용 ✓.

**2. CEO UX 7원칙** — 아래 표.

**3. 상태** — loading: KpiCard `value=null` 스켈레톤 · DataTable `skeletonRows` · 대시보드/총량 카드 스켈레톤 ✓. empty: DataTable `emptyText` (검색/필터/데모 분기 문구까지) ✓. error: `.ad-callout.error` + 토스트 error ✓. disabled: 버튼 ✓ / 토글 ✓ / **입력 ✗ (필수 3)**. focus: `.ad-root :focus-visible` 링 ✓, KPI 가 `<button>` 이라 키보드 도달 ✓, 행 `tabIndex=0`+Enter ✓. hover 행 액션 + `@media (hover:none)` 상시 ✓.

**4. 반응형** — 1280(KPI 2열·패딩) · 1024(사이드바 고정→드로어, 햄버거, 2-1 그리드 1열, 검색 200px, 드로어 100vw, compare 1열) · 640(KPI 1열, 검색 숨김, stat 1열, mini-stats 2열) 목업과 1:1 ✓. 640 에 `.ad-meta`·`.ad-toggle-grid` 1열, 본문 패딩 축소를 추가한 것은 개선 ✓. 햄버거 위치만 △ (권장 1).

**5. 흐름** — KPI 클릭 → `router.push("/admin/reward?status=pending_review")` → `useSearchParams` 초기 필터 ✓ / 행 클릭 → `selectedId` → Drawer ✓ / 승인·거절 후 `load()` → 다음 `pending_review` 자동 선택, 없으면 드로어 닫힘 ✓ (목업 `afterAction` 그대로) / 거절 = `ReasonModal required` + 빈 값 에러 + 200자 카운터 ✓ / 종료 = 사유 모달로 바뀐 것은 API 계약상 타당, 확인 1회 원칙도 지킴 ✓ / 정합식 스트립: 좌변 lhs → `=` → 항목들 `+/−` 연산자 · beta 빨강 · zero 회색 ✓, 0 항 숨김은 화면 단순화 방향이라 동의. 단 `warn` 톤이 안 보임 (필수 2).

**6. 강개발 질문** — 맨 아래.

**7. 사용자 앱과의 시각 일관성** — 사이드바 `--ad-sidebar-gradient` 가 `color-mix(var(--primary) 88%, #000) → var(--primary) → var(--primary-light)` 로 앱 `--primary` 기반 ✓. CTA 는 네이비 그라데이션, 골드 미사용 ✓ (관리자 = 운영 도구, 골드는 소비자 전환 버튼에만 남긴다는 원칙 유지). 카드 radius 16 · 버튼 10 · 칩 full · shadow md/xl 단계 ✓. Lucide 인라인 스프라이트 그대로 이식 ✓.

---

## CEO UX 7원칙 — 목업 대비 구현

| 원칙 | 판정 | 근거 |
|---|---|---|
| 1 상태는 눈으로 | △ | 배지 7톤·칩·selected 행 inset 바·정합 badge/bar 색 분기 ✓ (`admin.css:213-233,263`). 다만 `ad-term.warn` 무스타일 (`ledger:77`), 입력 disabled 무스타일 (`admin.css:347`) → 필수 2·3 |
| 2 흐름 이어짐 | ✓ | 승인/거절 → 다음 대기 건 자동 (`reward/page.tsx:133-136`), 모달 textarea `autoFocus` (`Modal.tsx:153`), Esc 닫힘 (`Drawer.tsx:17-24`) |
| 3 화면 흔들림 없음 | △ | selected 는 `inset box-shadow` (`admin.css:263`), 드로어/모달 fixed 오버레이 ✓. 탭 라벨 `(N)` 후속 삽입만 미세 밀림 (`reward:383`) → 권장 |
| 4 같은 버튼 2개 없음 | △ | 알림 종 제거하고 사이드바 배지로 일원화 ✓ (`layout.tsx:157`). 대시보드 ledger 진입 2개는 목업 유래 → 권장 |
| 5 밀도는 hover | ✓ | `.ad-row-actions` opacity 0 → hover/focus-within/selected 노출, `(hover:none)` 상시 (`admin.css:265-267`). 화면 주동작(스냅샷 생성·승인) 은 상시 |
| 6 모바일 재설계 | △ | 44px 타겟·btn-sm 44 승격·드로어 전폭·테이블 가로 스크롤 ✓. 햄버거가 제목 위 별도 행 (`layout.tsx:184`) → 권장 |
| 7 누르는 맛 | ✓ | `:active scale(.97)` 전 버튼, 드로어/모달/토스트 0.2s, 새로고침 spin, KPI hover 떠오름 (`admin.css:146,176-179,321,356,364`) |

보조 기준 — 파괴적 동작 확인 1회 ✓ (종료·거절·출금 승인 각 모달 1번). 데이터 내보내기 CSV 버튼은 목업에 있었으나 구현 미포함 — P1 로 미룬 것이면 OK, 회의록에 한 줄 남겨 주세요.

---

## 강개발 질문 답

- **(a) px 토큰 독립** — 구조는 맞음. `html{font-size:21px}` 는 rem 만 키우니 `.ad-root` 에서 px 로 재선언하면 관리자만 분리됨. 다만 **값이 16px 계열이 아님** (12/13/15 존재) → 필수 1. 목업 스케일 `16/16/16/18/20/26/32` 로.
- **(b) 드로어 520 / ≤1024 전폭, 테이블 min-width 1180·760~960** — 목업과 동일. 승인. 1180 은 캠페인 10열에 예산 바 160px 포함이라 필요. 드로어 안 지급내역 `minWidth={0}` 도 맞음.
- **(c) `--ad-chip-*`** — 목업 §2.6 값과 rgba·텍스트 HEX 전부 일치, `purple-text` 를 `var(--primary)` 로 묶은 것은 목업보다 나음. 승인. 다크 테마 재선언은 권장 2 와 함께.
- **(d) 햄버거** — PageHeader 로 옮기는 30분 안에 동의. 머지 차단은 아님. 옮길 때 `AdminContext` 에 `openSidebar` 하나 추가하고 레이아웃 폴백은 "PageHeader 없는 페이지" 조건으로만 남겨 두 개가 동시에 보이지 않게.

---

체크리스트 ✓ — 한 화면=한 목표 ✓ / 토큰만 (필수 1 고치면) ✓ / 폰트 ≥16 ✗→필수 1 / radius 10·16 ✓ / CTA 그라데이션+호버 ✓ / 상태 정의 (필수 2·3 고치면) ✓ / 모바일 44px ✓ / Lucide·존댓말 ✓
