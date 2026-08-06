import type { Building, Day, Room } from "../types";
import { formatMinutes, isRoomFreeAt, occupyingSlot } from "../utils/schedule";

interface Props {
  building: Building | null;
  rooms: Room[];
  day: Day;
  minute: number;
}

export default function BuildingRoomList({ building, rooms, day, minute }: Props) {
  if (!building) {
    return <div className="room-list-empty">지도에서 건물을 선택하면 강의실별 상태를 볼 수 있어요.</div>;
  }

  const sorted = [...rooms].sort((a, b) => a.room.localeCompare(b.room, "ko"));

  return (
    <div className="room-list">
      <h2>
        {building.name ?? `${building.code} (확인 필요)`}
        {building.needsReview && <span className="badge-review">건물명 확인 필요</span>}
      </h2>
      <ul>
        {sorted.map((room) => {
          const free = isRoomFreeAt(room, day, minute);
          const slot = free ? undefined : occupyingSlot(room, day, minute);
          return (
            <li key={room.id} className={free ? "room-item room-free" : "room-item room-busy"}>
              <span className="room-name">{room.room}</span>
              {free ? (
                <span className="room-status">비어있음</span>
              ) : (
                <span className="room-status">
                  {slot?.course} ({slot?.professor}) {slot && `${formatMinutes(slot.startMin)}~${formatMinutes(slot.endMin)}`}
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
