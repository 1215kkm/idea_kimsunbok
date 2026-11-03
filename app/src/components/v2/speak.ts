/** 결과를 목소리로 읽어준다 (브라우저 음성, 실패해도 조용히 넘어간다) */
export function speak(text: string) {
  try {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "ko-KR";
    u.rate = 0.9;
    window.speechSynthesis.speak(u);
  } catch {
    // 무시
  }
}
