import { useMemo, useState } from "react";
import KakaoMap, { type MapMarkerData } from "./components/KakaoMap";
import ControlPanel from "./components/ControlPanel";
import BuildingRoomList from "./components/BuildingRoomList";
import { useRooms } from "./hooks/useRooms";
import { useBuildings } from "./hooks/useBuildings";
import type { Day } from "./types";
import { computeBuildingStats, currentDay, currentMinutes } from "./utils/schedule";
import "./App.css";

const CAMPUSES = ["성서", "대명"];

export default function App() {
  const { rooms, loading: roomsLoading, error: roomsError } = useRooms();
  const { buildings, loading: buildingsLoading } = useBuildings();

  const now = new Date();
  const [campus, setCampus] = useState(CAMPUSES[0]);
  const [day, setDay] = useState<Day>(currentDay(now));
  const [minute, setMinute] = useState(currentMinutes(now));
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  const campusRooms = useMemo(() => rooms.filter((r) => r.campus === campus), [rooms, campus]);
  const stats = useMemo(() => computeBuildingStats(campusRooms, day, minute), [campusRooms, day, minute]);

  const markers: MapMarkerData[] = useMemo(() => {
    const list: MapMarkerData[] = [];
    for (const [key, s] of stats) {
      const building = buildings[key];
      if (!building || !building.name) continue;
      list.push({ building: { ...building, code: building.code }, free: s.free, total: s.total });
    }
    return list;
  }, [stats, buildings]);

  const unmappedInCampus = markers.filter((m) => m.building.lat == null);
  const selectedStats = selectedKey ? stats.get(selectedKey) : undefined;
  const selectedBuilding = selectedKey ? buildings[selectedKey] ?? null : null;

  const loading = roomsLoading || buildingsLoading;

  return (
    <div className="app">
      <header className="app-header">
        <img src="/favicon.jpg" alt="계명대학교 로고" className="app-logo" />
        <div>
          <h1>계명대 빈 강의실 찾기</h1>
          <p>성서/대명 캠퍼스 건물을 지도에서 골라 지금 비어있는 강의실을 확인하세요.</p>
        </div>
      </header>

      {roomsError ? (
        <div className="load-error">강의실 데이터를 불러오지 못했어요: {roomsError}</div>
      ) : loading ? (
        <div className="load-loading">데이터를 불러오는 중...</div>
      ) : (
        <main className="app-main">
          <ControlPanel
            campus={campus}
            campuses={CAMPUSES}
            onCampusChange={(c) => {
              setCampus(c);
              setSelectedKey(null);
            }}
            day={day}
            minute={minute}
            onDayChange={setDay}
            onMinuteChange={setMinute}
          />

          <div className="app-body">
            <KakaoMap markers={markers} selectedKey={selectedKey} onSelect={setSelectedKey} />
            <aside className="side-panel">
              <BuildingRoomList
                building={selectedBuilding}
                rooms={selectedStats?.rooms ?? []}
                day={day}
                minute={minute}
              />

              {unmappedInCampus.length > 0 && (
                <div className="unmapped-section">
                  <h3>위치 미확인 건물</h3>
                  <ul>
                    {unmappedInCampus.map((m) => {
                      const key = `${m.building.campus}:${m.building.code}`;
                      return (
                        <li key={key}>
                          <button className="link-button" onClick={() => setSelectedKey(key)}>
                            {m.building.name} ({m.free}/{m.total})
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </aside>
          </div>
        </main>
      )}
    </div>
  );
}
