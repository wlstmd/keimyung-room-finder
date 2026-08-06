import { DAYS, type Day } from "../types";
import { currentDay, currentMinutes, formatMinutes } from "../utils/schedule";

interface Props {
  campus: string;
  campuses: string[];
  onCampusChange: (c: string) => void;
  day: Day;
  minute: number;
  onDayChange: (d: Day) => void;
  onMinuteChange: (m: number) => void;
}

export default function ControlPanel({
  campus,
  campuses,
  onCampusChange,
  day,
  minute,
  onDayChange,
  onMinuteChange,
}: Props) {
  const setNow = () => {
    const now = new Date();
    onDayChange(currentDay(now));
    onMinuteChange(currentMinutes(now));
  };

  return (
    <div className="control-panel">
      <div className="control-group">
        {campuses.map((c) => (
          <button key={c} className={c === campus ? "chip chip-active" : "chip"} onClick={() => onCampusChange(c)}>
            {c}캠퍼스
          </button>
        ))}
      </div>

      <div className="control-group">
        {DAYS.slice(0, 6).map((d) => (
          <button key={d} className={d === day ? "chip chip-active" : "chip"} onClick={() => onDayChange(d)}>
            {d}
          </button>
        ))}
      </div>

      <div className="time-control">
        <input
          type="range"
          min={8 * 60}
          max={22 * 60}
          step={10}
          value={minute}
          onChange={(e) => onMinuteChange(Number(e.target.value))}
        />
        <span className="time-label">{formatMinutes(minute)}</span>
        <button className="btn-now" onClick={setNow}>
          지금
        </button>
      </div>
    </div>
  );
}
