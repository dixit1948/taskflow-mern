import { useEffect, useRef, useState } from "react";
import {
  Archive, ArchiveRestore, CalendarDays, Check, ListChecks, MoreHorizontal, Pencil, Pin, PinOff,
  Repeat, Timer, Trash2, Undo2
} from "lucide-react";
import { useTasks } from "../context/TasksContext";
import { useFocus } from "../context/FocusContext";
import { useConfirm } from "./Confirm";
import { formatDue, formatMinutes, isOverdue } from "../lib/dates";

export const STATUS_LABEL = { Pending: "Not Started", "In Progress": "In Progress", Completed: "Completed" };
const STATUS_CLASS = { Pending: "tone-red", "In Progress": "tone-blue", Completed: "tone-green" };
const PRIORITY_CLASS = { High: "tone-red", Medium: "tone-blue", Low: "tone-green", None: "tone-gray" };
const NEXT_STATUS = { Pending: "In Progress", "In Progress": "Completed", Completed: "Pending" };

function Menu({ items }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onDown = e => !ref.current?.contains(e.target) && setOpen(false);
    const onKey = e => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="menu" ref={ref}>
      <button
        className="icon-btn"
        aria-label="Task actions"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen(o => !o)}
      >
        <MoreHorizontal size={18} />
      </button>
      {open && (
        <div className="menu-list" role="menu">
          {items.map(item => (
            <button
              key={item.label}
              role="menuitem"
              className={item.danger ? "danger" : ""}
              onClick={() => {
                setOpen(false);
                item.run();
              }}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function TaskCard({ task, draggable = false, selectMode = false, selected = false, onToggleSelect }) {
  const { view, update, trash, restore, removeForever, setEditing } = useTasks();
  const focus = useFocus();
  const confirm = useConfirm();

  const done = task.status === "Completed";
  const inTrash = view === "trash";
  const overdue = isOverdue(task);
  const checkDone = task.checklist?.filter(i => i.done).length || 0;

  const items = inTrash
    ? [
        { label: "Restore", icon: <Undo2 size={16} />, run: () => restore(task._id) },
        {
          label: "Delete forever",
          icon: <Trash2 size={16} />,
          danger: true,
          run: async () => {
            const ok = await confirm({
              title: "Delete forever?",
              body: `“${task.title}” will be permanently removed. This can't be undone.`,
              confirmLabel: "Delete forever"
            });
            if (ok) removeForever(task._id);
          }
        }
      ]
    : [
        { label: "Edit", icon: <Pencil size={16} />, run: () => setEditing(task) },
        {
          label: task.pinned ? "Unpin" : "Pin to top",
          icon: task.pinned ? <PinOff size={16} /> : <Pin size={16} />,
          run: () => update(task._id, { pinned: !task.pinned })
        },
        { label: "Focus timer...", icon: <Timer size={16} />, run: () => focus.openPrompt(task) },
        task.archived
          ? { label: "Unarchive", icon: <ArchiveRestore size={16} />, run: () => update(task._id, { archived: false }) }
          : { label: "Archive", icon: <Archive size={16} />, run: () => update(task._id, { archived: true }) },
        { label: "Move to trash", icon: <Trash2 size={16} />, danger: true, run: () => trash(task._id) }
      ];

  return (
    <article
      className="tcard"
      data-color={task.color}
      data-done={done}
      draggable={draggable}
      onDragStart={e => {
        e.dataTransfer.setData("text/plain", task._id);
        e.dataTransfer.effectAllowed = "move";
      }}
    >
      {selectMode ? (
        <input
          type="checkbox"
          className="tcard-select"
          checked={selected}
          onChange={() => onToggleSelect(task._id)}
          aria-label={`Select ${task.title}`}
        />
      ) : (
        <button
          className={`ring ${STATUS_CLASS[task.status]}`}
          disabled={inTrash}
          onClick={() => update(task._id, { status: NEXT_STATUS[task.status] })}
          aria-label={`Status: ${STATUS_LABEL[task.status]}. Change to ${STATUS_LABEL[NEXT_STATUS[task.status]]}`}
          title={`${STATUS_LABEL[task.status]} (click to change)`}
        >
          {done && <Check size={12} strokeWidth={3} />}
        </button>
      )}

      <div
        className="tcard-body"
        onClick={() => !inTrash && (selectMode ? onToggleSelect(task._id) : setEditing(task))}
      >
        <h3>
          {task.pinned && <Pin size={13} className="pin-mark" aria-label="Pinned" />}
          {inTrash ? task.title : <button type="button" className="title-btn">{task.title}</button>}
        </h3>
        {task.notes && <p className="tcard-notes">{task.notes}</p>}
        <div className="meta">
          <span>
            Priority: <b className={PRIORITY_CLASS[task.priority]}>{task.priority === "None" ? "None" : task.priority}</b>
          </span>
          <span>
            Status: <b className={STATUS_CLASS[task.status]}>{STATUS_LABEL[task.status]}</b>
          </span>
          <span className="muted">Created on: {new Date(task.createdAt).toLocaleDateString("en-GB")}</span>
        </div>
        {(task.dueAt || task.repeat !== "none" || task.checklist?.length > 0 || task.focusMinutes > 0 || task.labels?.length > 0) && (
          <div className="chips">
            {task.dueAt && (
              <span className={`chip ${overdue ? "chip-danger" : ""}`}>
                <CalendarDays size={13} />
                {overdue ? "Overdue · " : ""}
                {formatDue(task)}
              </span>
            )}
            {task.repeat !== "none" && <span className="chip"><Repeat size={13} />{task.repeat}</span>}
            {task.checklist?.length > 0 && (
              <span className="chip"><ListChecks size={13} />{checkDone}/{task.checklist.length}</span>
            )}
            {task.focusMinutes > 0 && <span className="chip"><Timer size={13} />{formatMinutes(task.focusMinutes)}</span>}
            {task.labels?.map(l => <span key={l} className="chip">#{l}</span>)}
          </div>
        )}
      </div>

      <Menu items={items} />
    </article>
  );
}

