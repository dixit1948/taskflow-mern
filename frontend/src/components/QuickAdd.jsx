import { useEffect, useMemo, useState } from "react";
import { CalendarDays, Flag, Hash, Plus, Repeat } from "lucide-react";
import { parseQuick } from "../lib/parseQuick";
import { formatDue } from "../lib/dates";
import { useTasks } from "../context/TasksContext";
import { useToast } from "../context/ToastContext";

export default function QuickAdd({ defaultPriority = "None" }) {
  const { create, label } = useTasks();
  const toast = useToast();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const parsed = useMemo(() => parseQuick(text), [text]);

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("new")) document.getElementById("quick-add")?.focus();
  }, []);

  const submit = async e => {
    e.preventDefault();
    if (!parsed.title || busy) return;
    setBusy(true);
    try {
      await create({
        title: parsed.title,
        priority: parsed.priority !== "None" ? parsed.priority : defaultPriority,
        labels: [...new Set([...parsed.labels, ...(label ? [label] : [])])],
        repeat: parsed.repeat,
        ...(parsed.dueAt ? { dueAt: parsed.dueAt.toISOString(), allDay: parsed.allDay } : {})
      });
      setText("");
    } catch (err) {
      toast(err.message, { tone: "error" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="quick" onSubmit={submit}>
      <div className="quick-row">
        <Plus size={18} aria-hidden="true" />
        <input
          id="quick-add"
          value={text}
          onChange={e => setText(e.target.value)}
          maxLength={200}
          autoComplete="off"
          aria-label="Add a task"
          placeholder="Add task: Pay rent tomorrow 5pm !high #bills"
        />
        <button className="btn btn-primary" disabled={!parsed.title || busy}>
          {busy ? "Adding" : "Add task"}
        </button>
      </div>
      {text.trim() && (
        <div className="quick-chips" aria-live="polite">
          <span className="chip chip-title">{parsed.title || "Type a title"}</span>
          {parsed.dueAt && (
            <span className="chip"><CalendarDays size={13} />{formatDue({ dueAt: parsed.dueAt, allDay: parsed.allDay })}</span>
          )}
          {parsed.priority !== "None" && <span className="chip"><Flag size={13} />{parsed.priority}</span>}
          {parsed.repeat !== "none" && <span className="chip"><Repeat size={13} />{parsed.repeat}</span>}
          {parsed.labels.map(l => (
            <span key={l} className="chip"><Hash size={13} />{l}</span>
          ))}
        </div>
      )}
    </form>
  );
}
