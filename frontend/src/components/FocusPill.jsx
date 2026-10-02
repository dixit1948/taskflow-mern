import { Pause, Play, Square, Timer } from "lucide-react";
import { formatClock, useFocus } from "../context/FocusContext";

export default function FocusPill() {
  const { session, left, pause, resume, stop } = useFocus();
  if (!session) return null;
  const paused = session.pausedLeft != null;

  return (
    <div className="focus-pill" role="timer" aria-label="Focus timer">
      <Timer size={16} aria-hidden="true" />
      <div className="focus-info">
        <strong>{formatClock(left)}</strong>
        <span>{session.title}</span>
      </div>
      <button className="icon-btn" onClick={paused ? resume : pause} aria-label={paused ? "Resume" : "Pause"}>
        {paused ? <Play size={16} /> : <Pause size={16} />}
      </button>
      <button className="icon-btn" onClick={stop} aria-label="Stop and log time">
        <Square size={16} />
      </button>
    </div>
  );
}
