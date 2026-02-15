# 다랜드(Dataland) Firebase 아키텍처 및 배포/운영 시나리오

## Firebase 구성 요소

```
┌─────────────────────────────────────────────────────────┐
│                    Firebase 프로젝트                      │
├──────────────┬──────────────┬──────────────┬─────────────┤
│ Firebase     │ Cloud        │ Firebase     │ Cloud       │
│ Auth         │ Firestore    │ Hosting      │ Functions   │
│ (인증)       │ (데이터베이스) │ (웹앱 배포)   │ (비선형엔진) │
├──────────────┼──────────────┼──────────────┼─────────────┤
│ Cloud        │ Firebase     │ Firebase     │ Firebase    │
│ Storage      │ Analytics    │ Cloud        │ Extensions  │
│ (파일저장)    │ (분석)       │ Messaging    │ (결제연동)   │
│              │              │ (알림)       │             │
└──────────────┴──────────────┴──────────────┴─────────────┘
```

### 역할 매핑

| Firebase 서비스 | 다랜드 기능 |
|----------------|-----------|
| **Firebase Auth** | 소비자/가맹점/광고주/관리자 로그인 (카카오/네이버 연동) |
| **Cloud Firestore** | 거래내역, 포인트 원장, 멤버십 데이터, 광고 데이터 |
| **Cloud Functions** | 비선형공식 엔진, 포인트 적립/정산, 결제 처리 |
| **Firebase Hosting** | Next.js 웹앱 배포 |
| **Cloud Storage** | 광고 이미지, 가맹점 사진 등 |
| **Cloud Messaging** | 포인트 적립 알림, 광고 푸시 |
| **Firebase Analytics** | 사용자 행동 분석, 거래 통계 |

---

## Firestore 데이터 구조

```
firestore/
├── users/                          # 사용자 컬렉션
│   └── {userId}/
│       ├── role: "consumer"|"seller"|"advertiser"|"admin"
│       ├── name, phone, email
│       ├── membershipLevel: 1~10
│       ├── totalPoints: number
│       └── pointHistory/            # 서브컬렉션
│           └── {pointId}/
│               ├── amount, type, createdAt
│               └── transactionRef
│
├── stores/                         # 가맹점 컬렉션
│   └── {storeId}/
│       ├── name, address, category
│       ├── ownerId (→ users)
│       └── isActive: boolean
│
├── transactions/                   # 거래 컬렉션
│   └── {txId}/
│       ├── consumerId, storeId
│       ├── amount, paymentMethod
│       ├── nonlinearResult: {       # 비선형공식 결과
│       │   principal, feeIncome,
│       │   totalAccumulation, rate
│       │ }
│       └── createdAt
│
├── advertisements/                 # 그냥드림 광고
│   └── {adId}/
│       ├── advertiserId, title, content
│       ├── budget, rewardPerView
│       ├── viewCount, memberJoinCount
│       └── status: "active"|"paused"|"ended"
│
├── jobs/                           # 일찾는사람들
│   └── {jobId}/
│       ├── title, description
│       ├── employerId, location
│       ├── salary, jobType
│       └── applicants/             # 서브컬렉션
│
└── system/                         # 시스템 설정
    └── config/
        ├── nonlinearConfig: { sellerRate, consumerRate, ... }
        └── moneyPool: number       # 화폐승수 총량
```

---

## 배포 순서 (단계별)

### Phase 1: 기반 구축 (1~2주)
```
1. Firebase 프로젝트 생성
2. Next.js 프로젝트 초기화
3. Firebase SDK 연동
4. Firebase Auth 설정 (이메일 + 카카오/네이버)
5. Firestore 보안 규칙 설정
6. Firebase Hosting 배포 테스트
```

### Phase 2: 핵심 기능 (3~4주)
```
1. Cloud Functions에 비선형공식 엔진 배포
2. 회원가입/로그인 화면
3. 가맹점 등록 화면
4. 결제 시뮬레이션 (테스트 결제)
5. 포인트 120% 적립 실시간 확인
6. 내 포인트 대시보드
```

### Phase 3: 사업 기능 (3~4주)
```
1. 그냥드림 리워드 광고 시스템
2. 일찾는사람들 잡매칭
3. 지역광고/가맹점 매칭
4. PG사 실결제 연동 (토스페이먼츠)
5. 관리자 대시보드
```

### Phase 4: 출시 (1~2주)
```
1. 베타 테스트 (소수 가맹점)
2. 버그 수정 및 성능 최적화
3. 정식 출시
4. 마케팅 시작
```

---

## 사용자 시나리오 (서비스 흐름)

### 시나리오 1: 소비자 가입 → 결제 → 120% 적립

```
[소비자]                    [가맹점]                [시스템]
   │                          │                       │
   ├─① 앱 가입 (카카오 로그인)──►│                       │
   │                          │                       │
   ├─② 가맹점 방문 ──────────►│                       │
   │                          │                       │
   ├─③ 10,000원 결제 ────────►│                       │
   │                          ├─④ 결제 승인 ─────────►│
   │                          │                       │
   │                          │    ⑤ 비선형공식 실행     │
   │                          │    A1:1000xn(50%)      │
   │                          │    + B1:1000xn(50%)    │
   │                          │    = 120% 적립          │
   │                          │                       │
   │◄─── ⑥ 12,000 포인트 적립 알림 ───────────────────┤
   │     (원금 10,000 + 수수료소득 2,000)              │
   │                          │                       │
   │◄─── ⑦ 포인트로 다음 결제 가능 ──────────────────►│
```

### 시나리오 2: 그냥드림 광고 → 회원 확보 → 매출 증대

```
[광고주/신한그룹]        [시청자/소비자]          [가맹점]
   │                       │                     │
   ├─① 리워드 광고 등록 ──►│                     │
   │  (예산: 100만원)       │                     │
   │                       │                     │
   │  ② SNS로 광고 노출 ──►│                     │
   │                       │                     │
   │                       ├─③ 광고 시청 ────────►│
   │                       │  (리워드 포인트 수령)  │
   │                       │                     │
   │                       ├─④ 그냥드림 회원 가입 ►│
   │                       │                     │
   │                       ├─⑤ 가맹점 방문/결제 ──►│
   │                       │                     │
   │                       │◄── ⑥ 120% 적립 ─────┤
   │                       │                     │
   │◄── ⑦ 광고 성과 리포트 ──────────────────────┤
   │  (가입수, 방문수, 결제액)                     │
```

### 시나리오 3: 일찾는사람들 (잡매칭)

```
[구직자]                  [고용주/가맹점]          [시스템]
   │                        │                      │
   ├─① 데이터워커로 가입 ──►│                      │
   │                        │                      │
   │                        ├─② 일자리 등록 ──────►│
   │                        │                      │
   │◄── ③ 매칭 알림 ────────────────────────────── ┤
   │                        │                      │
   ├─④ 지원 ───────────────►│                      │
   │                        │                      │
   │                        ├─⑤ 채용 ─────────────►│
   │                        │                      │
   │◄── ⑥ 급여 결제 시 120% 적립 ─────────────────┤
```

---

## 운영 안정성 보장

### 실시간 모니터링
```
Firebase Console
├── Firestore 사용량 (읽기/쓰기 횟수)
├── Cloud Functions 실행 로그
├── Authentication 활성 사용자 수
├── Hosting 트래픽
└── Analytics 대시보드

알림 설정
├── 비선형공식 계산 오류 → 즉시 알림
├── 일일 거래량 급증 → 스케일링 알림
├── 포인트 적립 불일치 → 긴급 알림
└── 시스템 풀 잔액 부족 → 경고 알림
```

### 비용 예측 (Firebase 무료 티어 기준)
```
Firestore: 일 50,000 읽기 / 20,000 쓰기 무료
Auth: 무제한 무료
Hosting: 10GB 저장 / 월 360MB 전송 무료
Functions: 월 2백만 호출 무료

→ MVP 단계에서는 무료 티어로 충분!
→ 사용자 1만명 이상 시 Blaze 요금제 (종량제) 전환
```

---

## 핵심 정리

```
준비물 체크리스트:
✅ Google 계정 (Firebase 프로젝트 생성용)
✅ Node.js 18+ 설치
✅ Firebase CLI 설치 (npm install -g firebase-tools)
✅ 비선형공식 엔진 (구현 완료 ✓ - 30개 테스트 통과)
⬜ 카카오/네이버 개발자 계정 (소셜 로그인용)
⬜ PG사 테스트 계정 (토스페이먼츠 추천)
⬜ UI/UX 디자인 (Figma 등)
⬜ 도메인 (dataland.co.kr 등)
```
