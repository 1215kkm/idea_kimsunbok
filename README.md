# 다랜드(Dataland)

비선형공식 기반 120% 리워드 적립 플랫폼.

## 베타 테스트

- **배포 URL**: https://bok-sigma.vercel.app/
- **현재 상태**: 데모 모드 (Firebase 미연결, localStorage 기반)
- **피드백 수신**: `rute20002@gmail.com` (앱 내 💬 피드백 버튼)

### 테스트 가이드 (10명 베타용)

1. https://bok-sigma.vercel.app/ 접속 → 회원가입 (이메일/비밀번호 6자 이상)
2. ☰ 메뉴 → **지출등록** → 카테고리 선택 → 10,000원 입력 → 120% 적립 확인
3. ☰ 메뉴 → **내역** → 거래 누적 확인
4. ☰ 메뉴 → **출금** → 은행 등록 → 락(고리) 메커니즘 안내 확인
5. ☰ 메뉴 → **리워드 초대** → 초대 링크 생성 (10만~1억P 가변)
6. ☰ 메뉴 → **총량유지 모드** → 5단계 흐름 확인
7. ☰ 메뉴 → **회원 탈퇴** → 환불 안내 확인
8. 우측 하단 💬 피드백 버튼으로 의견 제출

> ⚠️ 데모 모드 한계: 같은 브라우저 내에서만 데이터가 공유됩니다. 회원 간 실제 분배·초대는 Firebase 실연동 후 동작합니다.

## 기술 스택

- Next.js 16 + Turbopack
- TypeScript
- Tailwind CSS 4
- Firebase Auth + Firestore (선택, 환경변수 설정 시)

## 개발

```bash
cd app
npm ci
npm run dev    # localhost:3000
npm run build  # 프로덕션 빌드
npm run lint
```
