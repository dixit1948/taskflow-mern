import { useState } from "react";
import { Timer } from "lucide-react";
import Modal from "./Modal";
import { useFocus } from "../context/FocusContext";

const PRESETS = [5, 10, 15, 25, 45, 60];

export default function FocusSetupModal() {
  const { promptTask, closePrompt, start } = useFocus();
  const [minutes, setMinutes] = useState(25);

  if (!promptTask) return null;

  const handleStart = () => {
    const validMins = Math.max(1, Math.min(180, Number(minutes) || 25));
    start(promptTask, validMins);
    closePrompt();
  };

  return (
    <Modal title="Focus Session Duration" onClose={closePrompt} size="sm">
      <div style={{ display: "grid", gap: 16 }}>
        <div>
          <span className="muted" style={{ fontSize: 13 }}>Focusing on</span>
          <p style={{ fontWeight: 600, fontSize: 15, margin: "2px 0 0" }}>{promptTask.title}</p>
        </div>

        <div className="field">
          <span>Quick presets</span>
          <div className="segmented" style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)" }}>
            {PRESETS.map(p => (
              <button
                type="button"
                key={p}
                className={minutes === p ? "on" : ""}
                onClick={() => setMinutes(p)}
              >
                {p}m
              </button>
            ))}
          </div>
        </div>

        <label className="field">
          <span>Custom minutes (1 – 180)</span>
          <input
            type="number"
            min="1"
            max="180"
            value={minutes}
            onChange={e => setMinutes(Math.max(1, Math.min(180, Number(e.target.value) || 1)))}
          />
        </label>

        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 6 }}>
          <button type="button" className="btn" onClick={closePrompt}>Cancel</button>
          <button type="button" className="btn btn-primary" onClick={handleStart}>
            <Timer size={16} /> Start ({minutes} min)
          </button>
        </div>
      </div>
    </Modal>
  );
}
