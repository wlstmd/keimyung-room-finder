import { useEffect, useRef } from "react";
import { useKakaoLoader } from "../hooks/useKakaoLoader";
import type { Building } from "../types";

export interface MapMarkerData {
  building: Building;
  free: number;
  total: number;
}

interface Props {
  markers: MapMarkerData[];
  selectedKey: string | null;
  onSelect: (key: string) => void;
}

function markerColor(free: number, total: number): string {
  if (total === 0) return "#9ca3af";
  const ratio = free / total;
  if (ratio === 0) return "#ef4444";
  if (ratio < 0.34) return "#f97316";
  return "#22c55e";
}

export default function KakaoMap({ markers, selectedKey, onSelect }: Props) {
  const { loaded, error } = useKakaoLoader();
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const overlaysRef = useRef<any[]>([]);

  useEffect(() => {
    if (!loaded || !containerRef.current || mapRef.current) return;
    const kakao = window.kakao;
    mapRef.current = new kakao.maps.Map(containerRef.current, {
      center: new kakao.maps.LatLng(35.8536, 128.4877),
      level: 5,
    });
  }, [loaded]);

  useEffect(() => {
    if (!loaded || !mapRef.current) return;
    const kakao = window.kakao;
    const map = mapRef.current;

    overlaysRef.current.forEach((o) => o.setMap(null));
    overlaysRef.current = [];

    const withCoords = markers.filter((m) => m.building.lat != null && m.building.lng != null);
    if (withCoords.length === 0) return;

    const bounds = new kakao.maps.LatLngBounds();
    for (const m of withCoords) {
      const pos = new kakao.maps.LatLng(m.building.lat!, m.building.lng!);
      bounds.extend(pos);

      const key = `${m.building.campus}:${m.building.code}`;
      const isSelected = key === selectedKey;
      const el = document.createElement("div");
      el.style.cssText = `
        display:flex;flex-direction:column;align-items:center;cursor:pointer;
        transform:translate(-50%,-100%);
      `;
      el.innerHTML = `
        <div style="background:${markerColor(m.free, m.total)};color:#fff;font-size:12px;font-weight:600;
          padding:4px 8px;border-radius:12px;white-space:nowrap;border:2px solid ${isSelected ? "#1d4ed8" : "#fff"};
          box-shadow:0 1px 4px rgba(0,0,0,.3);">
          ${m.building.name}<br/>${m.free}/${m.total}
        </div>
        <div style="width:0;height:0;border-left:6px solid transparent;border-right:6px solid transparent;
          border-top:6px solid ${markerColor(m.free, m.total)};"></div>
      `;
      el.addEventListener("click", () => onSelect(key));

      const overlay = new kakao.maps.CustomOverlay({
        position: pos,
        content: el,
        yAnchor: 1,
      });
      overlay.setMap(map);
      overlaysRef.current.push(overlay);
    }
    map.setBounds(bounds);
  }, [loaded, markers, selectedKey, onSelect]);

  const anyCoords = markers.some((m) => m.building.lat != null);
  return (
    <div className="map-wrap">
      <div ref={containerRef} className="map-canvas" />
      {error && <div className="map-overlay-notice map-overlay-error">{error}</div>}
      {!error && loaded && !anyCoords && (
        <div className="map-overlay-notice">
          이 캠퍼스 건물 좌표가 아직 없어요. scripts/geocode_buildings.py를 실행해 좌표를 채워주세요.
        </div>
      )}
      {!error && !loaded && <div className="map-overlay-notice">지도를 불러오는 중...</div>}
    </div>
  );
}
