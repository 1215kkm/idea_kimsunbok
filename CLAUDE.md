# 다랜드(Dataland) - Claude Code 작업 가이드

## 프로젝트 개요
비선형공식 기반 120% 리워드 적립 플랫폼. Next.js 16 + Firebase + TypeScript + Tailwind CSS 4.

## 핵심 규칙

### 브랜치 전략
- **절대로 main에 직접 push 금지**
- 작업 브랜치: `claude/{작업설명}` (예: `claude/add-payment-api`)
- 작업 완료 후 **반드시 PR 생성** → Cowork(코워크)가 리뷰 & 머지

### 작업 흐름
1. `main`에서 새 브랜치 생성
2. 코드 작성
3. `cd app && npm run build` 로 빌드 확인 (필수!)
4. 커밋 & push
5. `gh pr create` 로 PR 생성
6. Cowork가 pull → 로컬 테스트 → 리뷰 → 머지

### 커밋 메시지 규칙
```
feat: 새 기능 추가
fix: 버그 수정
refactor: 리팩토링
style: UI/스타일 변경
docs: 문서 수정
chore: 설정/빌드 관련
```

## 기술 스택 & 구조

```
idea_kimsunbok/
├── app/                    # Next.js 앱 (여기서 npm 명령 실행)
│   ├── src/
│   │   ├── app/            # 페이지 라우트
│   │   │   ├── page.tsx          # 로그인
│   │   │   ├── dashboard/        # 메인 대시보드
│   │   │   ├── stores/           # 소비 등록
│   │   │   ├── history/          # 거래 내역
│   │   │   ├── engine/           # 비선형공식 엔진
│   │   │   ├── withdraw/         # 출금 (미완성)
│   │   │   ├── admin/            # 관리자 (미완성)
│   │   │   ├── advertiser/       # 광고주 (미완성)
│   │   │   ├── cms-register/     # CMS 등록 (미완성)
│   │   │   ├── receipt-extract/  # 영수증 OCR (미완성)
│   │   │   ├── simulation/       # 시뮬레이션 (깨짐)
│   │   │   ├── card/             # 카드 뷰
│   │   │   ├── philosophy/       # 철학 페이지
│   │   │   ├── store-dashboard/  # 매장 대시보드
│   │   │   └── globals.css       # CSS 변수 기반 테마
│   │   ├── components/     # 공유 컴포넌트
│   │   ├── contexts/       # React Context (Auth, Theme)
│   │   └── lib/            # 유틸리티
│   │       ├── firebase.ts       # Firebase 설정
│   │       └── nonlinear-engine.ts  # 핵심 비선형공식
│   └── package.json
├── functions/              # Firebase Cloud Functions
├── firestore.rules         # Firestore 보안 규칙
├── docs/                   # 문서
└── .github/workflows/      # CI/CD
```

## 디자인 시스템

### 테마: 라이트 모드 기본
CSS 변수 사용 (`globals.css`):
- `--primary: #3B4CCA` (네이비 블루)
- `--accent: #FFB800` (골드)
- `--background: #F7F8FC` (밝은 회색)
- `--card-bg: #FFFFFF` (흰색 카드)
- `--text-muted: #6B7394`
- `--danger: #EF4444`
- `--success: #10B981`

### UI 규칙
- 배경: 흰색/밝은 회색 (`bg-white`, `bg-[#F7F8FC]`)
- 텍스트: 어두운 색 (`text-[#1A1F36]`, `text-[#6B7394]`)
- CTA 버튼: 골드 배경 + 어두운 텍스트 (`bg-[#FFB800] text-[#1A1F36]`)
- 카드: 흰색 배경 + 얇은 보더 (`bg-white border border-[#E8EAF0]`)
- **주의**: 밝은 배경 위에 `text-white` 사용 금지!
- 그라데이션 카드(파란색) 위에서만 `text-white` 허용

## Firebase 설정
- Auth: 이메일/비밀번호
- Firestore 컬렉션: `users`, `transactions`, `stores`, `advertisements`
- 환경변수: `.env.local` 에 Firebase config (없으면 데모 모드 자동 전환)

## 현재 완성도 & 우선순위 작업

### ✅ 완성 (건드리지 마세요)
- 로그인/회원가입 (Firebase Auth)
- 비선형공식 엔진 (nonlinear-engine.ts)
- 대시보드 기본 UI
- 라이트모드 테마
- Firestore 거래 등록/조회

### 🔧 구현 필요 (우선순위 순)
1. **Next.js API Routes** (`app/src/app/api/`)
   - POST `/api/transactions` - 거래 처리
   - POST `/api/withdraw` - 출금 요청
   - GET `/api/user/balance` - 잔액 조회
   - POST `/api/admin/approve-withdraw` - 출금 승인

2. **출금 시스템 실제 구현** (`withdraw/page.tsx`)
   - 현재: setTimeout 모의 처리 → Firestore 기반 출금 요청/승인 플로우

3. **관리자 패널** (`admin/page.tsx`)
   - 현재: 하드코딩 데모 → Firestore에서 실제 데이터 조회/관리

4. **Cloud Functions 연결** (`functions/index.js`)
   - 정의는 되어있으나 UI에서 미사용

5. **시뮬레이션 게임 수정** (`simulation/`)
   - iframe이 없는 HTML 참조 → React 컴포넌트로 전환

## 빌드 & 테스트
```bash
cd app
npm ci          # 의존성 설치
npm run build   # 프로덕션 빌드 (필수 확인!)
npm run lint    # ESLint
npm run dev     # 개발 서버 (localhost:3000)
```

## 주의사항
- `text-white`는 파란색 그라데이션 카드 위에서만 사용
- Tailwind 클래스에 하드코딩 색상 사용 시 CSS 변수 값과 일치시킬 것
- Firebase 미설정 환경에서도 데모 모드로 동작해야 함
- `npm run build` 성공 확인 없이 PR 만들지 말 것
