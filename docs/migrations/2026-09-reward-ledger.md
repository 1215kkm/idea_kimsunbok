# 2026-09 리워드 원장 전환 메모 (P0-1)

- 근거: `docs/admin-reward-plan.md` §2 (원장 흐름) · §4.2 (스키마) · §4.3 (기존 코드 변경점) · §8-1, §8-6 (CEO 확정 2026-09-06)
- 결정: 리워드 = 광고주 잔액 → 신규회원 잔액 **100% 제로섬 이전**. 광고주에게 되돌아가는 포인트 없음.

## 무엇이 바뀌었나

| 구 경로 (폐쇄) | 신 경로 |
|---|---|
| `POST /api/invite/code` → `inviteCodes/{code}` 발급 (예산 잠금 없음) | `POST /api/reward/campaigns` → `rewardCampaigns/{code}` 생성 + 광고주 `totalPoints` 에서 `unitAmount × headcount` 즉시 잠금 (`lockedPoints` 로 이동) |
| `POST /api/invite/redeem` / `redeemInviteCode()` → 신규회원 +100%, 광고주 +20% **무에서 생성** | `POST /api/reward/redeem` / `redeemCampaignCode()` → 광고주 `lockedPoints −unit`, 회원 `totalPoints +unit` |
| (없음) | 관리자 승인·거절·정지·재개·종료 `POST /api/admin/reward/campaigns/{id}/{action}` + `adminAuditLogs` |
| (없음) | 총량 정합 `GET /api/admin/ledger/totals` |

- 리딤 게이트 (강체크 사전 감사 반영): 이메일 인증 필수 (`EMAIL_NOT_VERIFIED` 403) · uid/구 초대/이메일 해시 셋 중 하나라도 있으면 `ALREADY_REDEEMED` 409 · 캠페인당 일일 상한 `dailyCap` (기본 10, `DAILY_CAP_REACHED` 429, 관리자 `POST .../{id}/daily-cap`).
- 광고주 자격: `createCampaign` 이 `transactions(type=deposit)` 누적 ≥ 100,000P 를 요구 (`INSUFFICIENT_QUALIFICATION` 403). 베타 초기 지급금은 입금이 아니므로 제외.
- 광고주 본인 취소: `POST /api/reward/campaigns/{id}/cancel` — `pending_review` 만, 전액 반환.
- `POST /api/invite/code`, `POST /api/invite/redeem` → **410 Gone** (`INVITE_DEPRECATED`). `GET /api/invite/code` 는 구 코드 조회용으로 유지.
- `GET /api/invite/info?code=` 는 `rewardCampaigns` 를 먼저 보고, 구 `inviteCodes` 만 있으면 410 `INACTIVE`.
- 가입 시 `?invite=CODE` 는 `post-signup` 에서 `redeemCampaignCode` 로 처리 (캠페인 코드만 지급됨).
- `lib/nonlinear-engine.ts` `calculateInviteReward` 는 **표시 전용** — 어떤 잔액에도 반영 금지 (JSDoc 명시).

## 기존 데이터 처리 — 수동 실행 스크립트 **불필요**

CEO 결정 §8-6: 베타 기간의 `inviteCodes` / `inviteRedemptions` / `transactions(type = invite_invitee | invite_advertiser)` 는
**소급 차감하지 않는다.** 실제 돈이 아닌 베타 시뮬레이션 데이터이기 때문.

- 세 컬렉션(문서)은 **읽기 전용 보존**. 삭제·수정하지 않는다. Firestore 규칙에서 쓰기는 원래부터 서버 전용이며, 서버 코드에서 신규 생성 경로를 전부 제거했으므로 더 이상 늘어나지 않는다.
- 총량 정합 API 는 `invite_invitee` (+amount) 와 `invite_advertiser` (+totalAccumulation = 구 20% 순증) 를 합산해 **`betaAdjustment` ("베타 조정")** 항목으로 따로 보여 준다. 좌변(Σ totalPoints + lockedPoints)과 우변(거래 합 + 베타 초기 지급금)이 맞는지 볼 때, 이 항이 "무에서 생성된 총액" 이다.
- 이미 구 초대로 받은 회원(`inviteRedemptions/{uid}` 존재)은 새 캠페인 코드로 다시 받을 수 없다 (`ALREADY_REDEEMED`). 1인 1회 원칙을 구·신 통틀어 적용.

## 새 필드 / 컬렉션

- `users.lockedPoints` (number, 기본 0) — 캠페인 에스크로 잔액. 기존 회원 문서에는 필드가 없을 수 있으며 코드는 없으면 0 으로 읽는다. **백필 불필요.**
- `rewardCampaigns/{code}` — 문서 ID = 8자 캠페인 코드 (`code` 필드에도 동일 값).
- `rewardPayouts/{inviteeUid}` — 1인 1회 멱등 키 (uid 단위).
- `rewardPayoutKeys/{sha256(정규화 이메일)}` — 1인 1회 보조 키 (이메일 단위, gmail 점·+태그 무시). 클라이언트 차단.
- `adminAuditLogs/{autoId}` — 관리자 액션 전부 (`withAdminAudit` 래퍼가 같은 트랜잭션에 before/after 기록).
- `transactions.type` 추가: `reward_lock` · `reward_out` · `reward_in` · `reward_refund` (+ `lockedDelta` 필드).

## 배포 순서

1. `firestore.rules` 배포 (`rewardCampaigns` 본인 읽기 / `rewardPayouts` 본인·광고주 읽기 / `adminAuditLogs` 차단).
2. `firestore.indexes.json` 배포 (`rewardCampaigns`: `ownerUid+createdAt`, `status+createdAt` / `transactions`: `consumerId+type` — 광고주 자격 집계용).
3. 앱 배포. 이후 `GET /api/admin/ledger/totals` 로 `diff` 와 `rewardNet` 이 0 인지 확인.

## 롤백

코드 롤백만으로 충분. 새 컬렉션은 구 코드가 읽지 않으며, `lockedPoints` 는 구 코드가 무시한다.
단, 롤백 시점에 `lockedPoints > 0` 인 회원이 있으면 그 금액은 구 코드에서 보이지 않으므로 롤백 전에 진행 중 캠페인을 전부 `end` 해서 반환시킬 것.
