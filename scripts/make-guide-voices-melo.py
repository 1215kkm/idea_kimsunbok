#!/usr/bin/env python3
"""
다랜드 설명영상 나레이션 음성 파일 만들기 — MeloTTS (내 컴퓨터에서 직접, 무료)

MeloTTS 는 MIT 라이선스 공개 음성 모델이라 상업 이용(유튜브 수익·홍보 영상)이 허락되고
출처 표기 의무도 없다 (쓰기 전에 MeloTTS 저장소의 LICENSE 를 한 번 확인할 것).
인터넷 없이 내 컴퓨터가 직접 소리를 만든다. 처음 한 번만 모델을 내려받는다.

대사는 make-guide-voices.py 의 LINES 를 그대로 쓰고, 결과 파일 이름은 「영상id__장면id.wav」
라서 편집 화면의 「음성 파일 한꺼번에 올리기」로 23개를 한 번에 넣으면 제자리에 들어간다.

설치 (한 번만, 파이썬 3.10 또는 3.11 권장):
  pip install git+https://github.com/myshell-ai/MeloTTS.git
  python -m unidic download

먼저 한 장면만 만들어 들어 보기:
  python scripts/make-guide-voices-melo.py --only m-money__intro
괜찮으면 전부:
  python scripts/make-guide-voices-melo.py
  python scripts/make-guide-voices-melo.py --speed 1.1     # 말 빠르기 (기본 1.0)
"""
import argparse
import os
import runpy
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
LINES = runpy.run_path(os.path.join(HERE, "make-guide-voices.py"))["LINES"]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--speed", type=float, default=1.0)
    ap.add_argument("--out", default="guide-voices")
    ap.add_argument("--only", help="이 이름(영상id__장면id)만 만들기")
    ap.add_argument("--device", default="auto", help="auto / cpu / cuda")
    a = ap.parse_args()

    try:
        from melo.api import TTS
    except ImportError:
        sys.exit("[에러] MeloTTS 가 설치돼 있지 않습니다. 위 설명의 '설치' 두 줄을 먼저 실행하세요.")

    todo = [x for x in LINES if not a.only or f"{x[0]}__{x[1]}" == a.only]
    if not todo:
        sys.exit(f"[에러] '{a.only}' 라는 장면이 없습니다. 예: m-money__intro")

    print("모델 불러오는 중… (처음엔 내려받느라 몇 분 걸릴 수 있음)")
    model = TTS(language="KR", device=a.device)
    spk = model.hps.data.spk2id["KR"]

    os.makedirs(a.out, exist_ok=True)
    for n, (vid, sid, text) in enumerate(todo, 1):
        path = os.path.join(a.out, f"{vid}__{sid}.wav")
        model.tts_to_file(text, spk, path, speed=a.speed)
        print(f"{n:2d}/{len(todo)}  {path}")
    print(f"\n완료: {a.out}/ 폴더의 파일을 「음성 파일 한꺼번에 올리기」로 한 번에 넣고 「저장하기」를 누르세요.")


if __name__ == "__main__":
    main()
