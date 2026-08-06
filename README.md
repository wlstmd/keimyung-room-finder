# 계명대 빈 강의실 찾기

성서/대명 캠퍼스 지도에서 건물을 고르면, 선택한 요일·시간에 그 건물의 어느 강의실이
비어있는지 보여주는 개인용 웹앱.

## 스택

- **React 19** + **TypeScript** + **Vite** (SPA, 별도 백엔드/DB 없음)
- 지도는 **카카오맵 JavaScript SDK** (무료, 도메인 등록 필요)
- 강의실 사용 데이터는 `public/data/rooms.json`, 건물 좌표는 `public/data/buildings.json`을
  `fetch`로 비동기 로딩 (재빌드 없이 새로고침만으로 데이터 갱신 반영)

## 최초 설정

1. `npm install`
2. [Kakao Developers](https://developers.kakao.com)에서 애플리케이션을 만들고:
   - **JavaScript 키**를 `.env`의 `VITE_KAKAO_JS_KEY`에 설정 (`.env.example` 참고)
   - 앱 설정 > 플랫폼 > Web에 `http://localhost:5173` (개발 서버 주소)와 실제
     배포 도메인을 등록해야 지도가 뜸 (등록 안 하면 "카카오맵 SDK 로드 실패" 오류)
3. `npm run dev`

## 데이터 출처와 갱신 방법 (학기마다 강의가 바뀔 때)

강의실 사용 데이터는 계명대 EDWARD 시스템의 "강의시간표 조회" 화면에서 단과대학별로
엑셀다운로드한 `개설강좌 강의시간목록(...).xlsx` 파일들을 파싱해서 만든다.

1. EDWARD > 강의시간표 조회에서 단과대학(또는 전체)별로 조회 후 엑셀다운로드
2. 받은 xlsx 파일들을 `~/Downloads` 또는 `~/Downloads/강의` 폴더에 둔 채로:

   ```bash
   python3 scripts/build_room_data.py
   ```

3. `public/data/rooms.json`이 갱신되면 새로고침만으로 반영됨 (재빌드 불필요, dev 서버 기준)
4. 스크립트가 `scripts/buildings-map.json`에 없는 건물 코드를 발견하면
   `public/data/unmapped-buildings.json`에 목록을 남기고 알려준다. 새 건물이 생기면
   `scripts/buildings-map.json`에 `"캠퍼스:코드": { "name": "건물명" }` 형태로 추가하고
   `npm run geocode`를 다시 실행하면 좌표까지 채워진다.

### 건물 좌표 갱신 (건물이 추가/변경됐을 때만, 평소엔 안 해도 됨)

```bash
export KAKAO_REST_API_KEY=발급받은_REST_API_키   # JavaScript 키와 다름
python3 scripts/geocode_buildings.py              # 좌표 없는 건물만 조회
python3 scripts/geocode_buildings.py --force      # 전체 재조회
```

카카오 로컬 검색(키워드 검색) API로 "계명대학교 {캠퍼스}캠퍼스 {건물명}"을 검색해
좌표를 채운다. 검색 결과가 없거나 대구 지역이 아닌 곳이 나오면 콘솔에 경고가 뜨니
`scripts/buildings-map.json`이나 `public/data/buildings.json`을 수동으로 고치면 된다.

## 확인이 아직 안 된 건물

`scripts/buildings-map.json`에 `needsReview: true`로 표시된 건물(현재: 명, 명교협력,
성서캠 수, 태, 구본)은 실제 건물명을 몰라서 지도에 표시되지 않고 "위치 미확인 건물"
목록으로만 뜬다. 확인되면 `name`을 채우고 스크립트를 다시 돌리면 된다.

## 개발

```bash
npm install
npm run dev      # 개발 서버
npm run build    # 타입체크 + 프로덕션 빌드
npm run lint     # oxlint
```
