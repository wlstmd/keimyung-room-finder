export type Day = "월" | "화" | "수" | "목" | "금" | "토" | "일";

export const DAYS: Day[] = ["월", "화", "수", "목", "금", "토", "일"];

export interface RoomSlot {
  day: Day;
  startMin: number; // 자정 기준 분
  endMin: number;
  course: string;
  professor: string;
}

export interface Room {
  id: string; // "성서-공2213"
  room: string; // "공2213"
  campus: string;
  buildingKey: string; // "성서:공"
  slots: RoomSlot[];
}

export interface Building {
  code: string;
  campus: string;
  name: string | null;
  needsReview: boolean;
  facility: boolean;
  excluded: boolean;
  lat?: number;
  lng?: number;
  address?: string;
}

export type BuildingsData = Record<string, Building>; // key: "캠퍼스:코드"
