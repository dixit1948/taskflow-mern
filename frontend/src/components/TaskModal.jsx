import { useState } from "react";
import { Archive, ArchiveRestore, Plus, Timer, Trash2, X } from "lucide-react";
import Modal from "./Modal";
import { useTasks } from "../context/TasksContext";
import { useFocus } from "../context/FocusContext";
import { fromInputs, toInputDate, toInputTime } from "../lib/dates";

const STATUSES = [["Pending", "Not Started"], ["In Progress", "In Progress"], ["Completed", "Completed"]];
const PRIORITIES = ["None", "Low", "Medium", "High"];
const COLORS = ["default", "sage", "sky", "butter", "blush", "lilac", "sand"];

export default function TaskModal() {
  const { editing, setEditing } = useTasks();
  if (!editing) return null;
  return <Editor key={editing._id} task={editing} onClose={() => setEditing(null)} />;
}

function Editor({ task, onClose }) {
  const { update, trash } = useTasks();
  const focus = useFocus();
  const [draft, setDraft] = useState(() => ({
    title: task.title,
    notes: task.notes || "",
    status: task.status,
    priority: task.priority,
    color: task.color,
    labels: task.labels || [],
    repeat: task.repeat,
    checklist: (task.checklist || []).map(i => ({ ...i })),
    date: toInputDate(task.dueAt),
    time: toInputTime(task.dueAt, task.allDay)
  }));
  const [labelText, setLabelText] = useState("");
  const [itemText, setItemText] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [customFocusMins, setCustomFocusMins] = useState(25);

  const set = (key, value) => setDraft(d => ({ ...d, [key]: value }));

  const addLabel = raw => {
    const label = raw.replace(/^#/, "").trim().toLowerCase().slice(0, 24);
    if (label && !draft.labels.includes(label) && draft.labels.length < 8) set("labels", [...draft.labels, label]);
    setLabelText("");
  };

  const addItem = () => {
    const text = itemText.trim();
    if (!text) return;
    set("checklist", [...draft.checklist, { text: text.slice(0, 200), done: false }]);
    setItemText("");
  };

  const save = async e => {
    e?.preventDefault();
    if (!draft.title.trim()) return setError("Give your task a title");
    setSaving(true);
    setError("");
    try {
      await update(task._id, {
        title: draft.title.trim(),
        notes: draft.notes,
        status: draft.status,
        priority: draft.priority,
        color: draft.color,
        labels: draft.labels,
        repeat: draft.repeat,
        checklist: draft.checklist.filter(i => i.text.trim()),
        ...fromInputs(draft.date, draft.time)
      });
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title="Edit task"
      onClose={onClose}
      footer={
        <>
          <div className="foot-left">
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => {
                update(task._id, { archived: !task.archived });
                onClose();
              }}
            >
              {task.archived ? <ArchiveRestore size={16} /> : <Archive size={16} />}
              {task.archived ? "Unarchive" : "Archive"}
            </button>
            <button
              type="button"
              className="btn btn-ghost btn-danger-text"
              onClick={() => {
                trash(task._id);
                onClose();
              }}
            >
              <Trash2 size={16} /> Delete
            </button>
          </div>
          <button type="button" className="btn" onClick={onClose}>Cancel</button>
          <button type="submit" form="task-form" className="btn btn-primary" disabled={saving}>
            {saving ? "Saving" : "Save changes"}
          </button>
        </>
      }
    >
      <form
        id="task-form"
        className="form"
        onSubmit={save}
        onKeyDown={e => (e.metaKey || e.ctrlKey) && e.key === "Enter" && save(e)}
      >
        {error && <p className="form-error" role="alert">{error}</p>}

        <label className="field">
          <span>Title</span>
          <input autoFocus value={draft.title} maxLength={140} onChange={e => set("title", e.target.value)} />
        </label>

        <label className="field">
          <span>Notes</span>
          <textarea rows={4} maxLength={4000} value={draft.notes} onChange={e => set("notes", e.target.value)} />
        </label>

        <div className="field">
          <span>Checklist</span>
          <ul className="checklist">
            {draft.checklist.map((item, i) => (
              <li key={item._id || i}>
                <input
                  type="checkbox"
                  checked={item.done}
                  aria-label={`Mark "${item.text}" done`}
                  onChange={() => set("checklist", draft.checklist.map((x, j) => (j === i ? { ...x, done: !x.done } : x)))}
                />
                <input
                  className="plain"
                  value={item.text}
                  maxLength={200}
                  onChange={e => set("checklist", draft.checklist.map((x, j) => (j === i ? { ...x, text: e.target.value } : x)))}
                />
                <button type="button" className="icon-btn" aria-label="Remove item" onClick={() => set("checklist", draft.checklist.filter((_, j) => j !== i))}>
                  <X size={15} />
                </button>
              </li>
            ))}
          </ul>
          <div className="inline-add">
            <input
              value={itemText}
              placeholder="Add a step"
              maxLength={200}
              onChange={e => setItemText(e.target.value)}
              onKeyDown={e => e.key === "Enter" && (e.preventDefault(), addItem())}
            />
            <button type="button" className="btn" onClick={addItem}><Plus size={16} /> Add</button>
          </div>
        </div>

        <div className="field">
          <span>Status</span>
          <div className="segmented" role="radiogroup" aria-label="Status">
            {STATUSES.map(([value, text]) => (
              <button type="button" key={value} role="radio" aria-checked={draft.status === value} className={draft.status === value ? "on" : ""} onClick={() => set("status", value)}>
                {text}
              </button>
            ))}
          </div>
        </div>

        <div className="field">
          <span>Priority</span>
          <div className="segmented" role="radiogroup" aria-label="Priority">
            {PRIORITIES.map(value => (
              <button type="button" key={value} role="radio" aria-checked={draft.priority === value} className={draft.priority === value ? "on" : ""} onClick={() => set("priority", value)}>
                {value}
              </button>
            ))}
          </div>
        </div>

        <div className="field-row">
          <label className="field">
            <span>Due date</span>
            <input type="date" value={draft.date} onChange={e => set("date", e.target.value)} />
          </label>
          <label className="field">
            <span>Time (optional)</span>
            <input type="time" value={draft.time} disabled={!draft.date} onChange={e => set("time", e.target.value)} />
          </label>
          <label className="field">
            <span>Repeat</span>
            <select value={draft.repeat} onChange={e => set("repeat", e.target.value)}>
              <option value="none">Does not repeat</option>
              <option value="daily">Every day</option>
              <option value="weekly">Every week</option>
              <option value="monthly">Every month</option>
            </select>
          </label>
        </div>

        <div className="field">
          <span>Labels</span>
          <div className="label-input">
            {draft.labels.map(l => (
              <span key={l} className="chip">
                #{l}
                <button type="button" aria-label={`Remove ${l}`} onClick={() => set("labels", draft.labels.filter(x => x !== l))}>
                  <X size={12} />
                </button>
              </span>
            ))}
            <input
              value={labelText}
              placeholder={draft.labels.length ? "" : "Type a label, press Enter"}
              onChange={e => (e.target.value.endsWith(",") ? addLabel(e.target.value.slice(0, -1)) : setLabelText(e.target.value))}
              onKeyDown={e => e.key === "Enter" && (e.preventDefault(), addLabel(labelText))}
              onBlur={() => labelText && addLabel(labelText)}
            />
          </div>
        </div>

        <div className="field">
          <span>Card colour</span>
          <div className="swatches" role="radiogroup" aria-label="Card colour">
            {COLORS.map(c => (
              <button
                type="button"
                key={c}
                role="radio"
                aria-checked={draft.color === c}
                aria-label={c}
                data-color={c}
                className={`swatch ${draft.color === c ? "on" : ""}`}
                onClick={() => set("color", c)}
              />
            ))}
          </div>
        </div>

        {task.focusMinutes > 0 && <p className="muted">{task.focusMinutes} min focused on this task so far.</p>}

        <div className="field">
          <span>Focus duration</span>
          <div className="segmented" style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)" }}>
            {[10, 15, 25, 45, 60].map(m => (
              <button
                type="button"
                key={m}
                className={customFocusMins === m ? "on" : ""}
                onClick={() => setCustomFocusMins(m)}
              >
                {m}m
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <input
            type="number"
            min="1"
            max="180"
            style={{ width: "90px" }}
            value={customFocusMins}
            onChange={e => setCustomFocusMins(Math.max(1, Math.min(180, Number(e.target.value) || 1)))}
            aria-label="Custom focus minutes"
          />
          <button
            type="button"
            className="btn btn-ghost focus-btn"
            style={{ flex: 1 }}
            onClick={() => (focus.start(task, customFocusMins), onClose())}
          >
            <Timer size={16} /> Start {customFocusMins} min focus
          </button>
        </div>
      </form>
    </Modal>
  );
}
