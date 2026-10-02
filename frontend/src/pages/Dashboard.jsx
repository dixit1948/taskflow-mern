import { Link } from "react-router-dom";
import { CircleCheck, ClipboardList, Flame, Sparkles, Timer, TriangleAlert } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useTasks } from "../context/TasksContext";
import QuickAdd from "../components/QuickAdd";
import TaskCard from "../components/TaskCard";
import Donut from "../components/Donut";
import { formatMinutes, greeting } from "../lib/dates";

export default function Dashboard() {
  const { user } = useAuth();
  const { tasks, loading, error, reload, stats, filters } = useTasks();

  const todo = tasks.filter(t => t.status !== "Completed");
  const done = tasks
    .filter(t => t.status === "Completed")
    .sort((a, b) => new Date(b.completedAt || b.updatedAt) - new Date(a.completedAt || a.updatedAt));

  const pct = n => (stats?.total ? Math.round((n / stats.total) * 100) : 0);
  const now = new Date();
  const searching = Boolean(filters.search);

  return (
    <div className="dash">
      <h1 className="welcome">
        Welcome back, {user.name.split(" ")[0]}
        <Sparkles size={22} style={{ display: "inline-block", verticalAlign: "middle", marginLeft: 8, color: "var(--coral)" }} />
      </h1>
      <p className="muted welcome-sub">{greeting()}. Here's where things stand today.</p>

      <div className="dash-grid">
        <section className="panel" aria-labelledby="todo-h">
          <header className="panel-head">
            <h2 id="todo-h"><ClipboardList size={18} /> To-Do</h2>
            <span className="muted">
              {now.toLocaleDateString("en-GB", { day: "numeric", month: "long" })} <span aria-hidden="true">•</span> Today
            </span>
          </header>
          <QuickAdd />

          {error && (
            <div className="notice" role="alert">
              {error} <button className="btn" onClick={reload}>Try again</button>
            </div>
          )}

          <div className="stack">
            {loading && [0, 1, 2].map(i => <div key={i} className="skeleton" />)}
            {!loading && todo.slice(0, 8).map(task => <TaskCard key={task._id} task={task} />)}
          </div>

          {!loading && !error && todo.length === 0 && (
            <div className="empty">
              <h3>{searching ? `Nothing matches “${filters.search}”` : "You're all caught up"}</h3>
              <p>{searching ? "Try a different search." : "Type a task above and press Enter. Try “Call mom tomorrow 6pm !high #family”."}</p>
            </div>
          )}
          {todo.length > 8 && <Link className="more-link" to="/tasks">See all {todo.length} tasks in My Task</Link>}
        </section>

        <div className="side">
          <section className="panel" aria-labelledby="status-h">
            <header className="panel-head">
              <h2 id="status-h"><CircleCheck size={18} /> Task Status</h2>
            </header>
            <div className="donuts">
              <Donut value={pct(stats?.completed || 0)} color="var(--green)" label="Completed" />
              <Donut value={pct(stats?.inProgress || 0)} color="var(--blue)" label="In Progress" />
              <Donut value={pct(stats?.pending || 0)} color="var(--red)" label="Not Started" />
            </div>
            <dl className="mini-stats">
              <div className={stats?.overdue ? "alert" : ""}>
                <dt><TriangleAlert size={14} /> Overdue</dt>
                <dd>{stats?.overdue ?? 0}</dd>
              </div>
              <div>
                <dt><Flame size={14} /> Day streak</dt>
                <dd>{stats?.streak ?? 0}</dd>
              </div>
              <div>
                <dt><Timer size={14} /> Focus time</dt>
                <dd>{formatMinutes(stats?.focusMinutes ?? 0)}</dd>
              </div>
            </dl>
          </section>

          <section className="panel" aria-labelledby="done-h">
            <header className="panel-head">
              <h2 id="done-h"><CircleCheck size={18} /> Completed Task</h2>
            </header>
            <div className="stack">
              {done.slice(0, 5).map(task => <TaskCard key={task._id} task={task} />)}
              {!loading && done.length === 0 && (
                <p className="muted pad">Finished tasks show up here. Tap the circle on a task to move it along.</p>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
