#!/usr/bin/env python3
"""
다랜드 설명영상 나레이션 음성 파일 만들기 — 일레븐랩스(ElevenLabs) v3 목소리

대사는 make-guide-voices.py 의 LINES 를 그대로 쓴다 (한 곳만 고치면 두 스크립트에 다 반영).
만든 파일 이름은 「영상id__장면id.mp3」 라서, 편집 화면의 「음성 파일 한꺼번에 올리기」로
23개를 한 번에 넣으면 영상 3편의 각 장면에 알아서 들어간다.

준비:
  1) 일레븐랩스 API 키를 환경변수에 넣는다 (채팅·코드에 붙여 넣지 말 것)
       윈도우 PowerShell :  $env:ELEVENLABS_API_KEY="키"
       맥·리눅스         :  export ELEVENLABS_API_KEY="키"
  2) 쓸 목소리 id 찾기
       python scripts/make-guide-voices-elevenlabs.py --list-voices

만들기:
  python scripts/make-guide-voices-elevenlabs.py --voice 목소리id
  python scripts/make-guide-voices-elevenlabs.py --voice 목소리id --only m-money__join   # 한 장면만 다시

설치할 것 없음 (파이썬 기본 기능만 사용).

⚠ 상업 이용(수익 영상·광고)은 일레븐랩스 유료 요금제 약관에서 허락 범위를 직접 확인할 것.
"""
import argparse
import json
import os
import runpy
import sys
import time
import urllib.error
import urllib.request

API = "https://api.elevenlabs.io/v1"
HERE = os.path.dirname(os.path.abspath(__file__))
LINES = runpy.run_path(os.path.join(HERE, "make-guide-voices.py"))["LINES"]


def call(method, path, key, body=None, accept="application/json"):
    req = urllib.request.Request(
        API + path,
        method=method,
        data=json.dumps(body).encode("utf-8") if body is not None else None,
        headers={"xi-api-key": key, "Content-Type": "application/json", "Accept": accept},
    )
    try:
        with urllib.request.urlopen(req, timeout=120) as r:
            return r.read()
    except urllib.error.HTTPError as e:
        detail = e.read().decode("utf-8", "replace")[:400]
        if e.code == 401:
            sys.exit("[에러] API 키가 맞지 않습니다. ELEVENLABS_API_KEY 를 확인하세요.")
        sys.exit(f"[에러] 일레븐랩스 응답 {e.code}: {detail}")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--voice", help="목소리 id (--list-voices 로 확인)")
    ap.add_argument("--model", default="eleven_v3", help="모델 id (기본 eleven_v3)")
    ap.add_argument("--stability", type=float, default=0.5, help="0~1, 낮을수록 표현이 풍부")
    ap.add_argument("--out", default="guide-voices")
    ap.add_argument("--only", help="이 이름(영상id__장면id)만 다시 만들기")
    ap.add_argument("--list-voices", action="store_true")
    a = ap.parse_args()

    key = os.environ.get("ELEVENLABS_API_KEY")
    if not key:
        sys.exit("[에러] 환경변수 ELEVENLABS_API_KEY 가 없습니다. 위 설명의 '준비 1)'을 먼저 하세요.")

    if a.list_voices:
        data = json.loads(call("GET", "/voices", key))
        for v in data.get("voices", []):
            labels = ", ".join(f"{k}:{val}" for k, val in (v.get("labels") or {}).items())
            print(f"{v['voice_id']}  {v['name']}  ({labels})")
        return

    if not a.voice:
        sys.exit("[에러] --voice 목소리id 를 넣어 주세요. (--list-voices 로 확인)")

    os.makedirs(a.out, exist_ok=True)
    todo = [x for x in LINES if not a.only or f"{x[0]}__{x[1]}" == a.only]
    for n, (vid, sid, text) in enumerate(todo, 1):
        body = {
            "text": text,
            "model_id": a.model,
            "voice_settings": {"stability": a.stability, "similarity_boost": 0.75},
        }
        audio = call("POST", f"/text-to-speech/{a.voice}?output_format=mp3_44100_128", key, body, accept="audio/mpeg")
        path = os.path.join(a.out, f"{vid}__{sid}.mp3")
        with open(path, "wb") as f:
            f.write(audio)
        print(f"{n:2d}/{len(todo)}  {path}")
        time.sleep(0.3)
    print(f"\n완료: {a.out}/ 폴더의 mp3 를 「음성 파일 한꺼번에 올리기」로 한 번에 넣고 「저장하기」를 누르세요.")


if __name__ == "__main__":
    main()
