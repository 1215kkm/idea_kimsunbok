#!/usr/bin/env python3
"""
다랜드 설명영상 나레이션 음성 파일 만들기 — 애저(Azure) 음성 무료 요금제 · SunHi 목소리

브라우저 「임시 목소리」와 같은 마이크로소프트 SunHi 목소리를, 마이크로소프트 클라우드의
정식 음성 서비스로 만든다. 무료 요금제(F0)는 신경망 음성을 매달 50만 자까지 무료로 주는데,
설명영상 3편 대사는 모두 합쳐 약 1,200자라 0원이다.

대사는 make-guide-voices.py 의 LINES 를 그대로 쓰고, 결과 파일 이름은 「영상id__장면id.mp3」
라서 편집 화면의 「음성 파일 한꺼번에 올리기」로 23개를 한 번에 넣으면 제자리에 들어간다.

준비 (한 번만):
  1) 애저 가입 → 「Speech 서비스」(음성 서비스) 리소스 만들기 → 가격 책정 계층 「Free F0」
     지역은 Korea Central 권장
  2) 리소스의 「키 및 엔드포인트」에서 키 1개와 지역을 환경변수에 넣는다 (채팅·코드에 붙여 넣지 말 것)
       윈도우 PowerShell :  $env:AZURE_SPEECH_KEY="키";  $env:AZURE_SPEECH_REGION="koreacentral"
       맥·리눅스         :  export AZURE_SPEECH_KEY="키"; export AZURE_SPEECH_REGION="koreacentral"

만들기:
  python scripts/make-guide-voices-azure.py
  python scripts/make-guide-voices-azure.py --rate +10%                 # 말 빠르기
  python scripts/make-guide-voices-azure.py --voice ko-KR-InJoonNeural  # 남자 목소리
  python scripts/make-guide-voices-azure.py --only m-money__join        # 한 장면만 다시

설치할 것 없음 (파이썬 기본 기능만 사용).
"""
import argparse
import os
import runpy
import sys
import time
import urllib.error
import urllib.request
from xml.sax.saxutils import escape

HERE = os.path.dirname(os.path.abspath(__file__))
LINES = runpy.run_path(os.path.join(HERE, "make-guide-voices.py"))["LINES"]


def synth(key, region, voice, rate, text):
    ssml = (
        '<speak version="1.0" xml:lang="ko-KR">'
        f'<voice name="{voice}"><prosody rate="{rate}">{escape(text)}</prosody></voice>'
        "</speak>"
    ).encode("utf-8")
    req = urllib.request.Request(
        f"https://{region}.tts.speech.microsoft.com/cognitiveservices/v1",
        method="POST",
        data=ssml,
        headers={
            "Ocp-Apim-Subscription-Key": key,
            "Content-Type": "application/ssml+xml",
            "X-Microsoft-OutputFormat": "audio-24khz-96kbitrate-mono-mp3",
            "User-Agent": "daland-guide-voices",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            return r.read()
    except urllib.error.HTTPError as e:
        if e.code == 401:
            sys.exit("[에러] 키나 지역이 맞지 않습니다. AZURE_SPEECH_KEY 와 AZURE_SPEECH_REGION 을 확인하세요.")
        if e.code == 429:
            sys.exit("[에러] 무료 요금제 사용 한도(분당 요청 수)를 넘었습니다. 1분 뒤 --only 로 남은 장면만 다시 만드세요.")
        sys.exit(f"[에러] 애저 응답 {e.code}: {e.read().decode('utf-8', 'replace')[:300]}")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--voice", default="ko-KR-SunHiNeural")
    ap.add_argument("--rate", default="+5%")
    ap.add_argument("--out", default="guide-voices")
    ap.add_argument("--only", help="이 이름(영상id__장면id)만 다시 만들기")
    a = ap.parse_args()

    key, region = os.environ.get("AZURE_SPEECH_KEY"), os.environ.get("AZURE_SPEECH_REGION")
    if not key or not region:
        sys.exit("[에러] 환경변수 AZURE_SPEECH_KEY / AZURE_SPEECH_REGION 이 없습니다. 위 설명의 '준비'를 먼저 하세요.")

    os.makedirs(a.out, exist_ok=True)
    todo = [x for x in LINES if not a.only or f"{x[0]}__{x[1]}" == a.only]
    for n, (vid, sid, text) in enumerate(todo, 1):
        path = os.path.join(a.out, f"{vid}__{sid}.mp3")
        with open(path, "wb") as f:
            f.write(synth(key, region, a.voice, a.rate, text))
        print(f"{n:2d}/{len(todo)}  {path}")
        time.sleep(0.5)
    print(f"\n완료: {a.out}/ 폴더의 mp3 를 「음성 파일 한꺼번에 올리기」로 한 번에 넣고 「저장하기」를 누르세요.")


if __name__ == "__main__":
    main()
