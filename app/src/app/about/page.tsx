import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "다랜드 — 쓸수록 쌓이는 결제·적립 플랫폼",
  description: "지출을 등록하면 포인트가 적립되는 다랜드. 개인회원·기업회원·광고주 모두 쓸 수 있습니다. (베타 시연 중)",
};

/**
 * 다랜드 공식 사이트 (로그인 전 소개 페이지)
 *
 * 도메인이 정해지면 그 도메인의 첫 화면을 이 페이지로 연결한다.
 * 베타 기간 문구: 포인트는 가상이며 실제 화폐가 아님 — 수익 보장처럼 읽히는 표현은 쓰지 않는다.
 * 사업자 정보(하단)는 등록이 끝나면 채운다 (통신판매업 신고 후 표기 의무).
 */

const STEPS = [
  { n: 1, title: "입금", body: "다랜드 내 계좌에 포인트를 채웁니다. 1P = 1원입니다." },
  { n: 2, title: "지출 등록", body: "어디에 썼는지 고르고 금액을 넣습니다. 지출 기록에 따라 포인트가 적립됩니다." },
  { n: 3, title: "내역 · 출금", body: "쌓인 포인트와 기록을 확인하고, 내 은행 계좌로 출금을 신청합니다." },
];

const WHO = [
  { title: "개인회원", body: "일상 지출을 등록하고 적립 포인트를 받습니다. 큰 글씨와 설명영상으로 처음이어도 쉽게 따라 할 수 있습니다." },
  { title: "기업회원", body: "상호와 사업자등록번호로 가입합니다. 사업자 확인 후 기업회원으로 이용합니다." },
  { title: "광고주", body: "내 예산으로 새 회원을 모읍니다. 가입한 회원이 지출할 때마다 지출액의 5%가 광고주에게 적립됩니다." },
];

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-[#F7F8FC] text-[#1A1F36]">
      {/* 머리줄 */}
      <header className="sticky top-0 z-30 border-b border-[#E8EAF0] bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-3 sm:px-6">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#3B4CCA] text-lg font-black text-white">D</span>
          <span className="flex-1 text-lg font-black text-[#3B4CCA]">다랜드</span>
          <Link href="/guide" className="rounded-lg px-3 py-2 text-sm font-bold text-[#565E80] hover:text-[#3B4CCA]">
            사용법 영상
          </Link>
          <Link href="/" className="rounded-lg bg-[#FFB800] px-4 py-2 text-sm font-bold text-[#1A1F36] hover:bg-[#E5A600]">
            로그인
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 pb-16 sm:px-6">
        {/* 첫 화면 */}
        <section className="mt-6 rounded-3xl bg-gradient-to-br from-[#3B4CCA] to-[#2D3A8C] px-6 py-12 text-white sm:px-12 sm:py-16">
          <p className="text-sm font-bold tracking-widest text-white/80">비선형공식 결제 · 적립 플랫폼</p>
          <h1 className="mt-3 text-3xl font-black leading-tight sm:text-5xl">
            쓸수록 쌓이는
            <br />
            다랜드
          </h1>
          <p className="mt-4 max-w-xl text-base leading-relaxed text-white/90 sm:text-lg">
            지출을 등록하면 다랜드 비선형공식에 따라 포인트가 적립됩니다. 개인도, 기업도, 광고주도 함께 씁니다.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/" className="rounded-xl bg-[#FFB800] px-6 py-3.5 text-base font-black text-[#1A1F36] hover:bg-[#E5A600]">
              무료로 시작하기
            </Link>
            <Link href="/guide" className="rounded-xl border-2 border-white/60 px-6 py-3.5 text-base font-bold text-white hover:bg-white/10">
              ▶ 사용법 영상 보기
            </Link>
          </div>
        </section>

        <p className="mt-4 rounded-xl border border-amber-500/30 bg-amber-50 px-4 py-3 text-sm leading-relaxed text-[#6B7394]">
          <strong className="text-amber-700">베타 시연 중</strong> — 지금 쌓이는 포인트는 시연용 가상 포인트이며 실제 화폐가 아닙니다. 적립 규칙은{" "}
          <Link href="/terms" className="font-bold text-[#3B4CCA] underline">
            이용약관
          </Link>
          을 따릅니다.
        </p>

        {/* 이렇게 써요 */}
        <section className="mt-14">
          <h2 className="text-2xl font-black sm:text-3xl">이렇게 써요</h2>
          <ol className="mt-6 grid gap-4 sm:grid-cols-3">
            {STEPS.map((s) => (
              <li key={s.n} className="rounded-2xl border border-[#E8EAF0] bg-white p-6">
                <span className="grid h-10 w-10 place-items-center rounded-full bg-[#3B4CCA]/10 text-lg font-black text-[#3B4CCA]">{s.n}</span>
                <h3 className="mt-4 text-lg font-black">{s.title}</h3>
                <p className="mt-2 text-base leading-relaxed text-[#565E80]">{s.body}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* 누가 쓰나요 */}
        <section className="mt-14">
          <h2 className="text-2xl font-black sm:text-3xl">누가 쓰나요</h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            {WHO.map((w) => (
              <div key={w.title} className="rounded-2xl border border-[#E8EAF0] bg-white p-6">
                <h3 className="text-lg font-black text-[#3B4CCA]">{w.title}</h3>
                <p className="mt-2 text-base leading-relaxed text-[#565E80]">{w.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* 누구나 쉽게 */}
        <section className="mt-14 grid items-center gap-6 rounded-2xl border border-[#E8EAF0] bg-white p-6 sm:grid-cols-[1fr_auto] sm:p-10">
          <div>
            <h2 className="text-2xl font-black sm:text-3xl">누구나 쉽게</h2>
            <p className="mt-3 text-base leading-relaxed text-[#565E80]">
              어르신과 장애인도 쓸 수 있도록 큰 글씨, 단순한 순서, 목소리로 읽어주는 설명영상을 준비했습니다. 휴대폰과 PC 모두에서 같은 화면으로 쓸 수 있습니다.
            </p>
          </div>
          <Link href="/guide" className="justify-self-start rounded-xl bg-[#3B4CCA] px-6 py-3.5 text-base font-bold text-white hover:bg-[#2D3A8C]">
            설명영상 보러 가기
          </Link>
        </section>

        {/* 마무리 */}
        <section className="mt-14 text-center">
          <h2 className="text-2xl font-black sm:text-3xl">지금 시작해 보세요</h2>
          <p className="mt-2 text-base text-[#565E80]">가입은 1분이면 끝납니다.</p>
          <Link href="/" className="mt-6 inline-block rounded-xl bg-[#FFB800] px-8 py-4 text-lg font-black text-[#1A1F36] hover:bg-[#E5A600]">
            무료로 시작하기
          </Link>
        </section>
      </main>

      {/* 사업자 정보 */}
      <footer className="border-t border-[#E8EAF0] bg-white">
        <div className="mx-auto max-w-5xl px-4 py-8 text-sm leading-relaxed text-[#6B7394] sm:px-6">
          <div className="flex flex-wrap gap-4 font-bold text-[#565E80]">
            <Link href="/terms" className="hover:text-[#3B4CCA]">이용약관</Link>
            <Link href="/privacy" className="hover:text-[#3B4CCA]">개인정보처리방침</Link>
            <Link href="/guide" className="hover:text-[#3B4CCA]">사용법 영상</Link>
          </div>
          <p className="mt-4">상호 다랜드 · 대표 (등록 예정) · 사업자등록번호 (등록 예정) · 통신판매업 신고 (등록 예정)</p>
          <p>고객센터 (준비 중)</p>
          <p className="mt-2">© 다랜드. 베타 시연 서비스입니다.</p>
        </div>
      </footer>
    </div>
  );
}
