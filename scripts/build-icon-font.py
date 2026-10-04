#!/usr/bin/env python3
"""
Material Symbols Outlined 서브셋 폰트 빌더.

app/public/fonts/material-symbols-subset.woff2 를 생성한다.

왜 스크립트로 두는가:
  아이콘을 새로 쓰기 시작했는데 서브셋에 없으면, 아이콘 대신 이름 글자가
  그대로 화면에 노출된다("arrow_back" 같은). 실제로 그 사고가 두 번 났다.
  새 아이콘을 쓰려면 아래 ICONS 에 추가하고 이 스크립트를 다시 돌릴 것.

사용법:
  pip install fonttools brotli
  python3 scripts/build-icon-font.py

검증:
  아래 ICONS 는 app/src/lib/icon-names.ts 의 SUBSET_ICONS 와 같아야 한다.
  <Icon name="..."> 는 그 유니온 타입만 받으므로, 목록에 없는 아이콘을 쓰면
  `cd app && npm run build` 가 실패한다.
"""

from __future__ import annotations

import sys
import urllib.request
from pathlib import Path

from fontTools import subset
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer

# 소스: Google Fonts 가 서빙하는 가변 폰트 원본.
# URL 이 죽으면 https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined
# 를 열어 @font-face 의 src URL 로 교체한다.
SOURCE_URL = (
    "https://fonts.gstatic.com/s/materialsymbolsoutlined/v373/"
    "kJEhBvYX7BgnkSrUwT8OhrdQw4oELdPIeeII9v6oFsI.woff2"
)

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "app" / "public" / "fonts" / "material-symbols-subset.woff2"
CACHE = Path("/tmp/material-symbols-full.woff2")

# 앱에서 실제로 쓰는 아이콘 전부. src/lib/icon-names.ts 의 SUBSET_ICONS 와 일치해야 한다.
ICONS = sorted(
    {
        # nav-items.ts — 사이드바 / 햄버거 / 하단탭
        "account_balance",
        "admin_panel_settings",
        "badge",
        "credit_card",
        "description",
        "home",
        "list_alt",
        "logout",
        "redeem",
        "savings",
        "settings",
        "swap_horiz",
        "sync",
        # 기타 화면
        "add_circle",
        "check",
        "close",
        "expand_less",
        "expand_more",
        "login",
        "notifications",
        "person",
        "person_add",
    }
)


def glyph_to_char(font: TTFont) -> dict[str, str]:
    """글리프 이름 -> 문자.

    밑줄·숫자 글리프 이름이 'underscore'/'digit_four' 라서 cmap 역매핑이 필요하다.
    한 글리프에 대문자·소문자 코드포인트가 함께 걸려 있어(예: 'a' <- U+0041, U+0061)
    복원 결과를 소문자로 맞춘다 — 아이콘 이름은 전부 소문자다.
    """
    mapping: dict[str, str] = {}
    for codepoint, name in font.getBestCmap().items():
        mapping.setdefault(name, chr(codepoint).lower())
    return mapping


def ligature_words(font: TTFont) -> set[str]:
    """이 폰트가 리거처로 인식하는 아이콘 이름 전체.

    한 글리프에 별칭이 여러 개 걸려 있으므로(예: 'close' 글리프 <- "close", "clear")
    글리프 기준이 아니라 단어 기준으로 모은다.
    """
    to_char = glyph_to_char(font)
    words: set[str] = set()
    for lookup in font["GSUB"].table.LookupList.Lookup:
        for st in lookup.SubTable:
            sub = getattr(st, "ExtSubTable", st)  # LookupType 7 (Extension)
            if not hasattr(sub, "ligatures"):
                continue
            for first, ligs in sub.ligatures.items():
                for lig in ligs:
                    parts = [first, *lig.Component]
                    words.add("".join(to_char.get(p, p) for p in parts))
    return words


def prune_ligatures(font: TTFont, keep: set[str]) -> set[str]:
    """keep 에 없는 리거처 규칙을 GSUB 에서 제거하고, 남은 규칙이 쓰는 글리프를 돌려준다.

    fontTools 의 자동 클로저는 '입력 문자 -> 만들 수 있는 모든 리거처' 방향이라
    글자만 넣어도 아이콘 수천 개가 딸려오고(용량 폭증), 정작 필요한 것이 빠지기도 한다.
    그래서 규칙을 직접 솎아낸 뒤 클로저를 끈 채로 서브셋한다.
    """
    to_char = glyph_to_char(font)

    def word_of(first: str, lig) -> str:
        return "".join(to_char.get(p, p) for p in (first, *lig.Component))

    needed: set[str] = set()
    for lookup in font["GSUB"].table.LookupList.Lookup:
        for st in lookup.SubTable:
            sub = getattr(st, "ExtSubTable", st)
            if not hasattr(sub, "ligatures"):
                continue
            pruned = {}
            for first, ligs in sub.ligatures.items():
                kept = [lig for lig in ligs if word_of(first, lig) in keep]
                if not kept:
                    continue
                pruned[first] = kept
                needed.add(first)
                for lig in kept:
                    needed.add(lig.LigGlyph)
                    needed.update(lig.Component)
            sub.ligatures = pruned
    return needed


def main() -> int:
    if not CACHE.exists():
        print(f"원본 내려받는 중… {SOURCE_URL}")
        urllib.request.urlretrieve(SOURCE_URL, CACHE)
    font = TTFont(CACHE)

    words = ligature_words(font)
    unknown = [i for i in ICONS if i not in words]
    if unknown:
        print(f"[에러] 원본 폰트에 없는 아이콘 이름: {unknown}", file=sys.stderr)
        print("       https://fonts.google.com/icons 에서 현재 이름을 확인할 것.", file=sys.stderr)
        return 1

    # FILL 축은 활성 메뉴 아이콘(<Icon filled />)이 실제로 쓰므로 남긴다.
    font = instancer.instantiateVariableFont(
        font, {"wght": 400, "GRAD": 0, "opsz": 24}, inplace=True
    )
    # fontTools 의 lazy gvar 는 변형 데이터가 없는 글리프에서 KeyError 를 낸다 — 미리 채운다.
    gvar = font["gvar"]
    gvar.variations = {g: gvar.variations.get(g, []) for g in font.getGlyphOrder()}

    keep_glyphs = prune_ligatures(font, set(ICONS))

    opts = subset.Options()
    opts.layout_features = ["liga", "rlig", "calt", "ccmp"]
    opts.layout_closure = False  # 규칙은 위에서 직접 솎았다
    opts.notdef_outline = True
    opts.glyph_names = True  # 검증 스크립트가 이름으로 확인할 수 있도록 보존
    opts.drop_tables = []

    subsetter = subset.Subsetter(options=opts)
    subsetter.populate(glyphs=sorted(keep_glyphs))
    subsetter.subset(font)

    font.flavor = "woff2"
    OUT.parent.mkdir(parents=True, exist_ok=True)
    font.save(OUT)

    check = TTFont(OUT)
    produced = ligature_words(check)
    missing = [i for i in ICONS if i not in produced]
    if missing:
        print(f"[에러] 빌드 결과에 빠진 아이콘: {missing}", file=sys.stderr)
        return 1

    print(f"완료: {OUT.relative_to(ROOT)}")
    print(f"  아이콘 {len(ICONS)}개 · 글리프 {len(check.getGlyphOrder())}개 · {OUT.stat().st_size:,} bytes")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
