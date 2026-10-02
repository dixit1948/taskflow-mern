import { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  Bell, CalendarDays, CircleAlert, CircleHelp, ClipboardCheck, LayoutDashboard, ListTree, LogOut, Moon,
  Search, Settings, Sun
} from "lucide-react";
import { TasksProvider, useTasks } from "../context/TasksContext";
import { FocusProvider, notify } from "../context/FocusContext";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { api } from "../api";
import { useTheme } from "../lib/theme";
import TaskModal from "./TaskModal";
import CommandPalette from "./CommandPalette";
import FocusPill from "./FocusPill";

const NAV = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, match: p => p === "/" },
  { to: "/vital", label: "Vital Task", icon: CircleAlert, match: p => p.startsWith("/vital") },
  { to: "/tasks", label: "My Task", icon: ClipboardCheck, match: p => ["/tasks", "/archive", "/trash"].some(x => p.startsWith(x)) },
  { to: "/categories", label: "Task Categories", icon: ListTree, match: p => p.startsWith("/categories") || p.startsWith("/label") },
  { to: "/settings", label: "Settings", icon: Settings, match: p => p.startsWith("/settings") },
  { to: "/help", label: "Help", icon: CircleHelp, match: p => p.startsWith("/help") }
];

const initials = name =>
  name.split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join("");

export default function Shell() {
  return (
    <TasksProvider>
      <FocusProvider>
        <ShellInner />
      </FocusProvider>
    </TasksProvider>
  );
}

function ShellInner() {
  const { user, logout } = useAuth();
  const { filters, setFilter } = useTasks();
  const toast = useToast();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [theme, toggleTheme] = useTheme();
  const [palette, setPalette] = useState(false);

  // keyboard shortcuts
  useEffect(() => {
    const onKey = e => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPalette(p => !p);
        return;
      }
      const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName) || e.target.isContentEditable;
      if (typing || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "/") {
        e.preventDefault();
        document.getElementById("global-search")?.focus();
      } else if (e.key.toLowerCase() === "n") {
        e.preventDefault();
        navigate("/");
        setTimeout(() => document.getElementById("quick-add")?.focus(), 60);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [navigate]);

  // due-time reminders (only while the app is open and permission is granted)
  useEffect(() => {
    if (!("Notification" in window) || Notification.permission !== "granted") return;
    const check = async () => {
      try {
        const { tasks } = await api.get("/tasks/upcoming");
        const seen = JSON.parse(localStorage.getItem("tf-notified") || "[]");
        const fresh = tasks.filter(t => !seen.includes(t._id + t.dueAt));
        fresh.forEach(t => notify("Task due now", t.title));
        if (fresh.length) {
          localStorage.setItem("tf-notified", JSON.stringify([...seen, ...fresh.map(t => t._id + t.dueAt)].slice(-100)));
        }
      } catch {
        /* ignore polling errors */
      }
    };
    check();
    const timer = setInterval(check, 60_000);
    return () => clearInterval(timer);
  }, []);

  const enableReminders = async () => {
    if (!("Notification" in window)) return toast("This browser doesn't support notifications.", { tone: "error" });
    if (Notification.permission === "granted") return toast("Reminders are on. You'll be alerted when timed tasks are due.");
    if (Notification.permission === "denied") return toast("Notifications are blocked. Allow them in your browser's site settings.", { tone: "error" });
    const result = await Notification.requestPermission();
    toast(result === "granted" ? "Reminders on. Reload the page to start receiving them." : "Reminders stay off.");
  };

  const onSearch = value => {
    setFilter("search", value);
    if (["/categories", "/settings", "/help"].some(p => pathname.startsWith(p))) navigate("/tasks");
  };

  const today = new Date();

  return (
    <div className="app">
      <a href="#main" className="skip">Skip to content</a>

      <header className="topbar">
        <Link to="/" className="logo" aria-label="TaskFlow home">
          <span>Task</span>Flow
        </Link>
        <div className="search">
          <Search size={17} aria-hidden="true" />
          <input
            id="global-search"
            type="search"
            value={filters.search}
            onChange={e => onSearch(e.target.value)}
            placeholder="Search your tasks here..."
            aria-label="Search tasks"
          />
          <kbd>/</kbd>
        </div>
        <div className="top-actions">
          <button className="square-btn" onClick={() => setPalette(true)} aria-label="Open command palette (Ctrl+K)" title="Command palette (Ctrl+K)">
            <span aria-hidden="true">⌘</span>
          </button>
          <button className="square-btn" onClick={enableReminders} aria-label="Reminders" title="Reminders">
            <Bell size={17} />
          </button>
          <button
            className="square-btn"
            onClick={() => {
              setFilter("sort", "due");
              navigate("/tasks");
            }}
            aria-label="Upcoming tasks by due date"
            title="Upcoming"
          >
            <CalendarDays size={17} />
          </button>
          <button className="square-btn square-btn-quiet" onClick={toggleTheme} aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}>
            {theme === "dark" ? <Sun size={17} /> : <Moon size={17} />}
          </button>
          <div className="today">
            <strong>{today.toLocaleDateString(undefined, { weekday: "long" })}</strong>
            <span>{today.toLocaleDateString("en-GB")}</span>
          </div>
        </div>
      </header>

      <div className="frame">
        <aside className="sidebar">
          <div className="profile">
            <div className="avatar" aria-hidden="true">{initials(user.name)}</div>
            <strong>{user.name}</strong>
            <span>{user.email}</span>
          </div>
          <nav aria-label="Main">
            {NAV.map(item => (
              <NavLink key={item.to} to={item.to} className={item.match(pathname) ? "nav-item active" : "nav-item"}>
                <item.icon size={19} aria-hidden="true" />
                {item.label}
              </NavLink>
            ))}
          </nav>
          <button className="nav-item logout" onClick={logout}>
            <LogOut size={19} aria-hidden="true" />
            Logout
          </button>
        </aside>

        <main className="main" id="main">
          <Outlet />
        </main>
      </div>

      <nav className="bottom-nav" aria-label="Main">
        {NAV.filter(n => n.to !== "/help" && n.to !== "/settings").map(item => (
          <NavLink key={item.to} to={item.to} className={item.match(pathname) ? "active" : ""}>
            <item.icon size={20} aria-hidden="true" />
            <span>{item.label.replace("Task Categories", "Categories")}</span>
          </NavLink>
        ))}
        <NavLink to="/settings" className={pathname.startsWith("/settings") ? "active" : ""}>
          <Settings size={20} aria-hidden="true" />
          <span>Settings</span>
        </NavLink>
      </nav>

      <TaskModal />
      <CommandPalette open={palette} onClose={() => setPalette(false)} theme={theme} toggleTheme={toggleTheme} />
      <FocusPill />
    </div>
  );
}
