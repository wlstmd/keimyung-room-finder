#!/usr/bin/env python3
"""
scripts/buildings-map.json에 정의된 건물명을 카카오 로컬 검색(키워드 검색) API로
지오코딩해서 public/data/buildings.json (건물별 위도/경도)을 생성한다.

사용법:
  export KAKAO_REST_API_KEY=발급받은_REST_API_키
  python3 scripts/geocode_buildings.py            # 좌표 없는 건물만 조회
  python3 scripts/geocode_buildings.py --force     # 전부 다시 조회

주의: REST API 키는 JavaScript 키와 다릅니다. Kakao Developers > 내 애플리케이션 >
앱 키 화면에서 "REST API 키"를 사용하세요.
"""
import json
import os
import sys
import urllib.error
import urllib.parse
import urllib.request

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
BUILDINGS_MAP_PATH = os.path.join(SCRIPT_DIR, "buildings-map.json")
OUT_PATH = os.path.join(SCRIPT_DIR, "..", "public", "data", "buildings.json")
ENV_PATH = os.path.join(SCRIPT_DIR, "..", ".env")
KEYWORD_URL = "https://dapi.kakao.com/v2/local/search/keyword.json"
CAMPUS_DISTRICT = {"성서": "달서구", "대명": "남구"}


def pick_best(docs: list[dict], campus: str) -> dict | None:
    """계명대 캠퍼스와 무관한 동명 업체(예: 멀티짐 체인점)를 걸러내고 고른다."""
    district = CAMPUS_DISTRICT.get(campus)
    for d in docs:
        addr = d.get("address_name") or ""
        if "계명" in (d.get("place_name") or "") or (district and district in addr):
            return d
    return None


def load_dotenv_fallback(key: str) -> str | None:
    """os.environ에 없으면 .env 파일에서 직접 읽어온다 (python-dotenv 의존성 없이)."""
    if not os.path.exists(ENV_PATH):
        return None
    with open(ENV_PATH, encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            k, v = line.split("=", 1)
            if k.strip() == key:
                return v.strip()
    return None


def search(query: str, api_key: str) -> list[dict]:
    url = f"{KEYWORD_URL}?{urllib.parse.urlencode({'query': query})}"
    req = urllib.request.Request(url, headers={"Authorization": f"KakaoAK {api_key}"})
    with urllib.request.urlopen(req, timeout=10) as resp:
        return json.load(resp)["documents"]


def main() -> None:
    api_key = os.environ.get("KAKAO_REST_API_KEY") or load_dotenv_fallback("KAKAO_REST_API_KEY")
    if not api_key:
        print("환경변수 KAKAO_REST_API_KEY를 설정해주세요 (카카오 REST API 키, .env에 넣어도 됩니다).", file=sys.stderr)
        sys.exit(1)
    force = "--force" in sys.argv

    with open(BUILDINGS_MAP_PATH, encoding="utf-8") as f:
        buildings_map = json.load(f)

    existing: dict[str, dict] = {}
    if os.path.exists(OUT_PATH):
        with open(OUT_PATH, encoding="utf-8") as f:
            existing = json.load(f)

    out: dict[str, dict] = {}
    needs_manual: list[str] = []

    for key, info in buildings_map.items():
        if key.startswith("_"):
            continue
        campus, code = key.split(":", 1)
        name = info.get("name")
        entry = {
            "code": code,
            "campus": campus,
            "name": name,
            "needsReview": bool(info.get("needsReview")),
            "facility": bool(info.get("facility")),
            "excluded": bool(info.get("excluded")),
        }

        if info.get("excluded") or not name:
            out[key] = entry
            continue

        if not force and key in existing and existing[key].get("lat"):
            out[key] = {**entry, "lat": existing[key]["lat"], "lng": existing[key]["lng"], "address": existing[key].get("address")}
            continue

        query = f"계명대학교 {campus}캠퍼스 {name}"
        try:
            docs = search(query, api_key)
        except urllib.error.HTTPError as e:
            print(f"[실패] {key} ({query}): HTTP {e.code} {e.read().decode('utf-8', 'ignore')}", file=sys.stderr)
            needs_manual.append(key)
            out[key] = entry
            continue

        d = pick_best(docs, campus)

        if not d:
            # 캠퍼스 이름을 빼고 재시도 (동명 업체가 섞일 수 있어 pick_best로 다시 거름)
            query2 = f"계명대학교 {name}"
            try:
                docs2 = search(query2, api_key)
            except urllib.error.HTTPError:
                docs2 = []
            d = pick_best(docs2, campus)

        if not d:
            print(f"[검색결과 없음] {key} ({query}) - 수동 확인 필요", file=sys.stderr)
            needs_manual.append(key)
            out[key] = entry
            continue

        out[key] = {
            **entry,
            "lat": float(d["y"]),
            "lng": float(d["x"]),
            "address": d.get("road_address_name") or d.get("address_name"),
        }

    os.makedirs(os.path.dirname(OUT_PATH), exist_ok=True)
    with open(OUT_PATH, "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, indent=2)

    geocoded = sum(1 for v in out.values() if "lat" in v)
    print(f"{geocoded}개 건물 좌표를 {os.path.abspath(OUT_PATH)} 에 저장했어요.")
    if needs_manual:
        print(f"확인이 필요한 항목({len(needs_manual)}개): {', '.join(needs_manual)}", file=sys.stderr)


if __name__ == "__main__":
    main()
