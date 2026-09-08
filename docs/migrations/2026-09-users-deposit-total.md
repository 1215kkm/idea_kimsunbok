# users.depositTotal 비정규화 (2026-09, PR #38 강체크 N-1)

## 왜
광고주 자격(확인된 입금 누적 ≥ 100,000P)을 판정하려고 `transactions(type=deposit)` 를 전건 스캔했다.
회원 1만 · 입금 12만 건이면 `GET /api/admin/users` 가 3~6초, 20만 건부터 Vercel Hobby 10초 타임아웃.

## 무엇
- `users.depositTotal: number` — 회원의 확인된 입금 누적. `POST /api/deposit` 이 입금 트랜잭션 안에서 갱신.
- 읽는 곳: `api/admin/users` (회원 목록 광고주 판정), `reward-service.getConfirmedDepositTotal` (캠페인 제출 자격).
- 둘 다 **필드 우선, 없으면 거래 스캔 폴백**. 폴백은 `depositTotal` 이 `number` 가 아닌 회원에게만.

## 기존 회원 (필드 없음)
백필 스크립트 없이 자연 수렴시킨다:
1. `api/deposit` 은 필드가 없는 회원의 **첫 입금** 때 트랜잭션 읽기 단계에서 기존 deposit 거래를 합산해 `depositTotal = Σ기존 + 이번` 으로 쓴다 (`sumDepositsInTx`).
2. 그 전까지는 위 두 읽기 경로가 스캔 폴백으로 같은 값을 돌려준다. `api/admin/users` 응답의 `depositScanFallback` 이 폴백 대상 회원 수 — 0 이 되면 전원 수렴.

한 번에 채우고 싶으면 (선택, Firestore 콘솔/Admin SDK 스크립트):
```
for each users/{uid} where depositTotal == undefined:
  depositTotal = Σ transactions where consumerId == uid and type == "deposit" → amount
```
읽기 전용 집계라 언제 돌려도 안전하고, 돌리는 동안 입금이 들어오면 `api/deposit` 쪽 값이 이긴다 (같은 합산식).

## 주의
- P1-2 입금 확인(deposits pending → confirmed) 이 들어오면 `depositTotal` 은 **confirmed 시점**에 더해야 한다. `api/deposit` 즉시 반영(beta_virtual)은 그때 걷어낸다.
- 베타 초기 지급금(`users.betaTestFunds`)은 입금이 아니다. `depositTotal` 에 넣지 않는다.
