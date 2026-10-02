import { useState } from "react";
import TaskCard, { STATUS_LABEL } from "./TaskCard";
import { useTasks } from "../context/TasksContext";

const COLUMNS = ["Pending", "In Progress", "Completed"];

export default function Board({ tasks, selectMode, selected, onToggleSelect }) {
  const { update } = useTasks();
  const [over, setOver] = useState(null);

  const drop = (e, status) => {
    e.preventDefault();
    setOver(null);
    const id = e.dataTransfer.getData("text/plain");
    const task = tasks.find(t => t._id === id);
    if (task && task.status !== status) update(id, { status }).catch(() => {});
  };

  return (
    <div className="board">
      {COLUMNS.map(status => {
        const column = tasks.filter(t => t.status === status);
        return (
          <section
            key={status}
            className={`column ${over === status ? "column-over" : ""}`}
            onDragOver={e => {
              e.preventDefault();
              setOver(status);
            }}
            onDragLeave={() => setOver(null)}
            onDrop={e => drop(e, status)}
            aria-label={STATUS_LABEL[status]}
          >
            <header>
              <h3>{STATUS_LABEL[status]}</h3>
              <span className="count">{column.length}</span>
            </header>
            <div className="column-list">
              {column.map(task => (
                <TaskCard
                  key={task._id}
                  task={task}
                  draggable={!selectMode}
                  selectMode={selectMode}
                  selected={selected.includes(task._id)}
                  onToggleSelect={onToggleSelect}
                />
              ))}
              {column.length === 0 && <p className="column-empty">Drop tasks here</p>}
            </div>
          </section>
        );
      })}
    </div>
  );
}
