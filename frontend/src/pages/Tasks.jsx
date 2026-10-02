import { useEffect, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { CheckSquare, Columns3, LayoutGrid } from "lucide-react";
import { useTasks } from "../context/TasksContext";
import { useToast } from "../context/ToastContext";
import { useConfirm } from "../components/Confirm";
import QuickAdd from "../components/QuickAdd";
import TaskCard from "../components/TaskCard";
import Board from "../components/Board";

const STATUS_FILTERS = [["All", "All"], ["Pending", "Not Started"], ["In Progress", "In Progress"], ["Completed", "Completed"]];

export default function Tasks() {
  const { pathname } = useLocation();
  const toast = useToast();
  const confirm = useConfirm();
  const { view, label, filters, setFilter, layout, setLayout, tasks, loading, error, reload, bulk, emptyTrash } = useTasks();

  const vital = pathname.startsWith("/vital");
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState([]);

  useEffect(() => {
    setSelectMode(false);
    setSelected([]);
  }, [pathname]);

  const list = vital ? tasks.filter(t => t.status !== "Completed") : tasks;
  const title = vital ? "Vital Task" : label ? `#${label}` : view === "archived" ? "Archive" : view === "trash" ? "Trash" : "My Task";
  const subtitle = vital
    ? "High-priority tasks that still need you."
    : label ? "Tasks with this label."
    : view === "archived" ? "Out of the way, but not gone. Unarchive any time."
    : view === "trash" ? "Items here are deleted forever after 30 days."
    : "Everything on your plate in one place.";

  const showBoard = layout === "board" && view === "active" && !vital && filters.status === "All";
  const pinned = list.filter(t => t.pinned);
  const rest = list.filter(t => !t.pinned);
  const toggle = id => setSelected(s => (s.includes(id) ? s.filter(x => x !== id) : [...s, id]));
  const filtered = filters.search || filters.status !== "All" || filters.priority !== "All";

  const run = async (action, extra, message) => {
    const affected = await bulk(action, selected, extra);
    if (affected) toast(`${affected} task${affected === 1 ? "" : "s"} ${message}`);
    setSelected([]);
    setSelectMode(false);
  };

  const deleteForever = async () => {
    const ok = await confirm({
      title: `Delete ${selected.length} task${selected.length === 1 ? "" : "s"} forever?`,
      body: "This can't be undone.",
      confirmLabel: "Delete forever"
    });
    if (ok) run("delete", {}, "deleted forever");
  };

  const clearTrash = async () => {
    const ok = await confirm({ title: "Empty trash?", body: "Every task in Trash will be deleted forever.", confirmLabel: "Empty trash" });
    if (ok) emptyTrash();
  };

  const renderCards = items => (
    <div className="grid">
      {items.map(task => (
        <TaskCard key={task._id} task={task} selectMode={selectMode} selected={selected.includes(task._id)} onToggleSelect={toggle} />
      ))}
    </div>
  );

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <h1>{title}</h1>
          <p className="muted">{subtitle}</p>
        </div>
        {view === "trash" && list.length > 0 && <button className="btn btn-danger-outline" onClick={clearTrash}>Empty trash</button>}
      </header>

      {!vital && !label && (
        <nav className="tabs" aria-label="Task views">
          <NavLink to="/tasks" end>Active</NavLink>
          <NavLink to="/archive">Archive</NavLink>
          <NavLink to="/trash">Trash</NavLink>
        </nav>
      )}

      {view === "active" && <QuickAdd defaultPriority={vital ? "High" : "None"} />}

      <div className="toolbar">
        {!vital && (
          <div className="segmented" role="group" aria-label="Filter by status">
            {STATUS_FILTERS.map(([value, text]) => (
              <button key={value} className={filters.status === value ? "on" : ""} aria-pressed={filters.status === value} onClick={() => setFilter("status", value)}>
                {text}
              </button>
            ))}
          </div>
        )}
        <div className="toolbar-right">
          {!vital && (
            <select aria-label="Filter by priority" value={filters.priority} onChange={e => setFilter("priority", e.target.value)}>
              <option value="All">All priorities</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
              <option value="None">No priority</option>
            </select>
          )}
          <select aria-label="Sort tasks" value={filters.sort} onChange={e => setFilter("sort", e.target.value)}>
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="due">Due date</option>
            <option value="priority">Priority</option>
          </select>
          {view === "active" && !vital && (
            <div className="segmented segmented-icons" role="group" aria-label="Layout">
              <button className={layout === "cards" ? "on" : ""} aria-pressed={layout === "cards"} onClick={() => setLayout("cards")} aria-label="Cards" title="Cards">
                <LayoutGrid size={16} />
              </button>
              <button className={layout === "board" ? "on" : ""} aria-pressed={layout === "board"} onClick={() => setLayout("board")} aria-label="Board" title="Board">
                <Columns3 size={16} />
              </button>
            </div>
          )}
          <button className={`btn ${selectMode ? "btn-primary" : ""}`} aria-pressed={selectMode} onClick={() => (setSelectMode(s => !s), setSelected([]))}>
            <CheckSquare size={16} /> Select
          </button>
        </div>
      </div>

      {error && (
        <div className="notice" role="alert">
          {error} <button className="btn" onClick={reload}>Try again</button>
        </div>
      )}

      {loading && <div className="grid">{[0, 1, 2, 3, 4, 5].map(i => <div key={i} className="skeleton tall" />)}</div>}

      {!loading && !error && list.length === 0 && (
        <div className="empty">
          <h3>
            {filtered ? "No tasks match these filters"
              : view === "trash" ? "Trash is empty"
              : view === "archived" ? "Nothing archived yet"
              : vital ? "No vital tasks right now"
              : "No tasks yet"}
          </h3>
          <p>
            {filtered ? "Clear the search or filters to see everything."
              : view === "trash" ? "Tasks you delete wait here for 30 days."
              : view === "archived" ? "Archive finished tasks from the ⋯ menu to keep your list tidy."
              : vital ? "Add a task with !high and it will show up here."
              : "Type a task above and press Enter."}
          </p>
        </div>
      )}

      {!loading && list.length > 0 && showBoard && (
        <Board tasks={list} selectMode={selectMode} selected={selected} onToggleSelect={toggle} />
      )}
      {!loading && list.length > 0 && !showBoard && (
        <>
          {pinned.length > 0 && rest.length > 0 && <h2 className="section-title">Pinned</h2>}
          {pinned.length > 0 && renderCards(pinned)}
          {pinned.length > 0 && rest.length > 0 && <h2 className="section-title">Others</h2>}
          {rest.length > 0 && renderCards(rest)}
        </>
      )}

      {selectMode && (
        <div className="bulkbar" role="region" aria-label="Bulk actions">
          <strong>{selected.length} selected</strong>
          <button className="btn" onClick={() => setSelected(selected.length === list.length ? [] : list.map(t => t._id))}>
            {selected.length === list.length ? "Clear" : "Select all"}
          </button>
          {view === "active" && (
            <>
              <button className="btn" disabled={!selected.length} onClick={() => run("status", { status: "Completed" }, "marked done")}>Mark done</button>
              <button className="btn" disabled={!selected.length} onClick={() => run("archive", {}, "archived")}>Archive</button>
            </>
          )}
          {view === "archived" && <button className="btn" disabled={!selected.length} onClick={() => run("unarchive", {}, "unarchived")}>Unarchive</button>}
          {view === "trash" && <button className="btn" disabled={!selected.length} onClick={() => run("restore", {}, "restored")}>Restore</button>}
          {view === "trash" ? (
            <button className="btn btn-danger" disabled={!selected.length} onClick={deleteForever}>Delete forever</button>
          ) : (
            <button className="btn btn-danger" disabled={!selected.length} onClick={() => run("trash", {}, "moved to trash")}>Move to trash</button>
          )}
        </div>
      )}
    </div>
  );
}
