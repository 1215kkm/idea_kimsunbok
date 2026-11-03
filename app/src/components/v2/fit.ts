/** 큰 숫자를 한 줄에 담는 글자 크기 (휴대폰 폭 390px 기준, 자릿수가 많으면 줄인다) */
export function bigNumberSize(text: string): string {
  if (text.length <= 7) return "text-[56px]"; // 100,000
  if (text.length <= 10) return "text-[44px]"; // 1,000,000
  if (text.length <= 13) return "text-[36px]"; // 1,000,000,000
  return "text-[30px]";
}
