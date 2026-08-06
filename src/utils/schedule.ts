import { DAYS, type Day, type Room } from "../types";

export function formatMinutes(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function currentDay(date: Date): Day {
  // getDay(): 0=일 1=월 ... 6=토
  return DAYS[(date.getDay() + 6) % 7];
}

export function currentMinutes(date: Date): number {
  return date.getHours() * 60 + date.getMinutes();
}

export function isRoomFreeAt(room: Room, day: Day, minute: number): boolean {
  return !room.slots.some((s) => s.day === day && minute >= s.startMin && minute < s.endMin);
}

export function occupyingSlot(room: Room, day: Day, minute: number) {
  return room.slots.find((s) => s.day === day && minute >= s.startMin && minute < s.endMin);
}

export interface BuildingStats {
  buildingKey: string;
  total: number;
  free: number;
  rooms: Room[];
}

export function computeBuildingStats(rooms: Room[], day: Day, minute: number): Map<string, BuildingStats> {
  const stats = new Map<string, BuildingStats>();
  for (const room of rooms) {
    let bucket = stats.get(room.buildingKey);
    if (!bucket) {
      bucket = { buildingKey: room.buildingKey, total: 0, free: 0, rooms: [] };
      stats.set(room.buildingKey, bucket);
    }
    bucket.total += 1;
    bucket.rooms.push(room);
    if (isRoomFreeAt(room, day, minute)) bucket.free += 1;
  }
  return stats;
}
