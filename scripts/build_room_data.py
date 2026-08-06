#!/usr/bin/env python3
"""
계명대 EDWARD 시간표조회(https://edward.kmu.ac.kr)에서 학과/단과대학별로
"엑셀다운로드"한 '개설강좌 강의시간목록(...).xlsx' 파일들을 읽어
public/data/rooms.json (강의실별 사용중 시간대)과
public/data/unmapped-buildings.json (scripts/buildings-map.json에 없는 건물 코드 목록)
을 생성한다.

사용법:
1. EDWARD > 강의시간표 조회에서 단과대학(또는 전체)별로 조회 후 엑셀다운로드
2. 받은 xlsx 파일들을 ~/Downloads 또는 ~/Downloads/강의 폴더에 둔 채로:
     python3 scripts/build_room_data.py
3. public/data/rooms.json이 갱신되면 앱을 새로고침하면 바로 반영됨 (재빌드 불필요, dev 서버 기준)

openpyxl/pandas 등 외부 라이브러리 없이 표준 라이브러리(zipfile + xml)만으로
xlsx의 sheet1.xml을 직접 파싱한다. (keimyung-timetable 프로젝트의 import 스크립트와 동일한 방식)
"""
import glob
import json
import os
import re
import sys
import unicodedata
import xml.etree.ElementTree as ET
import zipfile

DOWNLOADS_DIR = os.path.expanduser("~/Downloads")
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
BUILDINGS_MAP_PATH = os.path.join(SCRIPT_DIR, "buildings-map.json")
ROOMS_OUT_PATH = os.path.join(SCRIPT_DIR, "..", "public", "data", "rooms.json")
UNMAPPED_OUT_PATH = os.path.join(SCRIPT_DIR, "..", "public", "data", "unmapped-buildings.json")
FILENAME_MARKER = "개설강좌"

NS = {"m": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}
SLOT_RE = re.compile(r"([월화수목금토일])(\d{2}):(\d{2})~(\d{2}):(\d{2})(?:\(([^)]*)\))?")
PREFIX_RE = re.compile(r"^([가-힣A-Za-z]+)")


def read_rows(path: str) -> list[list[str]]:
    with zipfile.ZipFile(path) as z:
        root = ET.fromstring(z.read("xl/worksheets/sheet1.xml"))

    def row_cells(row: ET.Element) -> list[str]:
        cells = []
        for c in row.findall("m:c", NS):
            t = c.find("m:is/m:t", NS)
            if t is not None:
                cells.append(t.text or "")
            else:
                v = c.find("m:v", NS)
                cells.append(v.text if v is not None else "")
        return cells

    return [row_cells(r) for r in root.findall(".//m:row", NS)]


def parse_times(raw: str) -> list[dict]:
    raw = (raw or "").strip()
    if not raw or "원격수업" in raw:
        return []
    slots = []
    for day, sh, sm, eh, em, room in SLOT_RE.findall(raw):
        room = room.strip()
        if not room:
            continue
        slots.append(
            {
                "day": day,
                "startMin": int(sh) * 60 + int(sm),
                "endMin": int(eh) * 60 + int(em),
                "room": room,
            }
        )
    return slots


def find_input_files() -> list[str]:
    marker = unicodedata.normalize("NFC", FILENAME_MARKER)
    candidates = glob.glob(os.path.join(DOWNLOADS_DIR, "*.xlsx")) + glob.glob(
        os.path.join(DOWNLOADS_DIR, "*", "*.xlsx")
    )
    seen = set()
    files = []
    for f in candidates:
        rp = os.path.realpath(f)
        if rp in seen:
            continue
        seen.add(rp)
        if marker in unicodedata.normalize("NFC", os.path.basename(f)):
            files.append(f)
    return sorted(files)


def building_key(campus: str, room: str) -> str | None:
    m = PREFIX_RE.match(room)
    if not m:
        return None
    prefix = m.group(1)
    if len(prefix) > 1 and prefix.endswith("B"):
        prefix = prefix[:-1]
    return f"{campus}:{prefix}"


def main() -> None:
    files = find_input_files()
    if not files:
        print(
            f"'{FILENAME_MARKER}'가 포함된 xlsx 파일을 {DOWNLOADS_DIR} (및 하위 폴더)에서 찾지 못했어요.",
            file=sys.stderr,
        )
        sys.exit(1)

    with open(BUILDINGS_MAP_PATH, encoding="utf-8") as f:
        buildings_map = json.load(f)

    rooms: dict[str, dict] = {}
    unmapped: dict[str, dict] = {}

    for path in files:
        rows = read_rows(path)
        for r in rows[1:-1]:  # 첫 행(헤더)과 마지막 행(총건수) 제외
            if len(r) < 17:
                continue
            code = (r[2] or "").strip()
            name = (r[3] or "").strip()
            if not code or not name:
                continue
            campus = (r[16] or "").strip() or "기타"
            professor = (r[9] or "").strip()
            for slot in parse_times(r[13]):
                room = slot["room"]
                key = building_key(campus, room)
                if key is None:
                    continue

                mapping = buildings_map.get(key)
                if mapping is None or (mapping.get("name") is None and not mapping.get("excluded")):
                    entry = unmapped.setdefault(key, {"campus": campus, "examples": []})
                    if room not in entry["examples"] and len(entry["examples"]) < 6:
                        entry["examples"].append(room)

                if mapping is not None and mapping.get("excluded"):
                    continue

                room_id = f"{campus}-{room}"
                bucket = rooms.setdefault(
                    room_id,
                    {"id": room_id, "room": room, "campus": campus, "buildingKey": key, "slots": []},
                )
                bucket["slots"].append(
                    {
                        "day": slot["day"],
                        "startMin": slot["startMin"],
                        "endMin": slot["endMin"],
                        "course": name,
                        "professor": professor,
                    }
                )

    os.makedirs(os.path.dirname(ROOMS_OUT_PATH), exist_ok=True)
    with open(ROOMS_OUT_PATH, "w", encoding="utf-8") as f:
        json.dump(list(rooms.values()), f, ensure_ascii=False, separators=(",", ":"))

    with open(UNMAPPED_OUT_PATH, "w", encoding="utf-8") as f:
        json.dump(unmapped, f, ensure_ascii=False, indent=2)

    print(f"{len(files)}개 파일에서 강의실 {len(rooms)}개, 시간대 슬롯 {sum(len(v['slots']) for v in rooms.values())}개를 {os.path.abspath(ROOMS_OUT_PATH)} 에 저장했어요.")
    if unmapped:
        print(
            f"buildings-map.json에 없는 건물 코드 {len(unmapped)}개를 {os.path.abspath(UNMAPPED_OUT_PATH)} 에 기록했어요. "
            "이 건물들은 지도에서 '확인 필요'로 표시됩니다."
        )


if __name__ == "__main__":
    main()
