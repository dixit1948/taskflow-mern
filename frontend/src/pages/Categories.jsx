import { Link } from "react-router-dom";
import { Hash } from "lucide-react";
import { useTasks } from "../context/TasksContext";

export default function Categories() {
  const { labelCounts } = useTasks();
  return (
    <div className="page">
      <header className="page-head">
        <div>
          <h1>Task Categories</h1>
          <p className="muted">Your labels, with how many open tasks each one holds.</p>
        </div>
      </header>
      {labelCounts.length === 0 ? (
        <div className="empty">
          <h3>No categories yet</h3>
          <p>Add a label while creating a task, like “Renew passport #personal”. It will appear here.</p>
        </div>
      ) : (
        <div className="grid grid-sm">
          {labelCounts.map(({ label, count }) => (
            <Link key={label} to={`/label/${encodeURIComponent(label)}`} className="category">
              <Hash size={18} aria-hidden="true" />
              <strong>{label}</strong>
              <span>{count} task{count === 1 ? "" : "s"}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
