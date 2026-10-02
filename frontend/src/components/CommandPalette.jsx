import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search } from "lucide-react";
import { useTasks } from "../context/TasksContext";
import { useAuth } from "../context/AuthContext";

export default function CommandPalette({ open, onClose, theme, toggleTheme }) {
  return open ? <Palette onClose={onClose} theme={theme} toggleTheme={toggleTheme} /> : null;
}

function Palette({ onClose, theme, toggleTheme }) {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const { tasks, labels, layout, setLayout, setEditing } = useTasks();
  const [query, setQuery] = useState("");
  const [index, setIndex] = useState(0);

  const go = path => () => navigate(path);

  const commands = useMemo(
    () => [
      {
        label: "New task",
        run: () => {
          navigate("/");
          setTimeout(() => document.getElementById("quick-add")?.focus(), 60);
        }
      },
      { label: "Go to Dashboard", run: go("/") },
      { label: "Go to Vital Task", run: go("/vital") },
      { label: "Go to My Task", run: go("/tasks") },
      { label: "Go to Archive", run: go("/archive") },
      { label: "Go to Trash", run: go("/trash") },
      { label: "Go to Task Categories", run: go("/categories") },
      { label: "Go to Settings", run: go("/settings") },
      { label: "Go to Help", run: go("/help") },
      { label: theme === "dark" ? "Switch to light theme" : "Switch to dark theme", run: toggleTheme },
      {
        label: layout === "board" ? "Show tasks as cards" : "Show tasks as board",
        run: () => {
          setLayout(layout === "board" ? "cards" : "board");
          navigate("/tasks");
        }
      },
      ...labels.map(l => ({ label: `Open #${l}`, run: go(`/label/${encodeURIComponent(l)}`) })),
      { label: "Sign out", run: logout }
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [theme, layout, labels]
  );

  const q = query.trim().toLowerCase();
  const results = useMemo(() => {
    if (!q) return commands.slice(0, 9);
    const taskItems = tasks.map(t => ({ label: t.title, hint: "Task", run: () => setEditing(t) }));
    return [...commands, ...taskItems].filter(i => i.label.toLowerCase().includes(q)).slice(0, 10);
  }, [q, commands, tasks, setEditing]);

  const choose = item => {
    onClose();
    item?.run();
  };

  const onKeyDown = e => {
    if (e.key === "ArrowDown") (e.preventDefault(), setIndex(i => Math.min(i + 1, results.length - 1)));
    else if (e.key === "ArrowUp") (e.preventDefault(), setIndex(i => Math.max(i - 1, 0)));
    else if (e.key === "Enter") choose(results[index]);
    else if (e.key === "Escape") onClose();
  };

  return (
    <div className="overlay overlay-top" onMouseDown={e => e.target === e.currentTarget && onClose()}>
      <div className="palette" role="dialog" aria-modal="true" aria-label="Command palette">
        <div className="palette-input">
          <Search size={18} aria-hidden="true" />
          <input
            autoFocus
            value={query}
            placeholder="Search tasks or type a command"
            onChange={e => (setQuery(e.target.value), setIndex(0))}
            onKeyDown={onKeyDown}
            role="combobox"
            aria-expanded="true"
            aria-controls="palette-list"
          />
        </div>
        <ul id="palette-list" role="listbox">
          {results.map((item, i) => (
            <li
              key={item.label + i}
              role="option"
              aria-selected={i === index}
              className={i === index ? "active" : ""}
              onMouseEnter={() => setIndex(i)}
              onClick={() => choose(item)}
            >
              <span>{item.label}</span>
              {item.hint && <small>{item.hint}</small>}
            </li>
          ))}
          {results.length === 0 && <li className="palette-empty">Nothing matches “{query}”</li>}
        </ul>
      </div>
    </div>
  );
}
