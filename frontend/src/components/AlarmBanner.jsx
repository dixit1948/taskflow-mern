import { BellOff, BellRing } from "lucide-react";
import { useFocus } from "../context/FocusContext";

export default function AlarmBanner() {
  const { alarmActive, dismissAlarm } = useFocus();

  if (!alarmActive) return null;

  return (
    <div className="alarm-overlay" role="dialog" aria-modal="true" aria-labelledby="alarm-heading">
      <div className="alarm-card">
        <div className="alarm-icon-wrap" aria-hidden="true">
          <BellRing size={32} className="alarm-bell" />
        </div>
        <div className="alarm-text">
          <h2 id="alarm-heading">Focus Time Complete! 🔔</h2>
          <p>
            Logged <strong>{alarmActive.minutes} min</strong> on <em>“{alarmActive.title}”</em>. Time to take a breather!
          </p>
        </div>
        <button
          type="button"
          className="btn btn-primary alarm-dismiss-btn"
          onClick={dismissAlarm}
          autoFocus
        >
          <BellOff size={18} aria-hidden="true" />
          <span>Stop Alarm</span>
        </button>
      </div>
    </div>
  );
}
