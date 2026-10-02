import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { api } from "../api";
import { useToast } from "./ToastContext";

const TasksContext = createContext(null);

const readPref = (key, fallback) => {
  try {
    return localStorage.getItem(key) || fallback;
  } catch {
    return fallback;
  }
};

export function TasksProvider({ children }) {
  const { pathname } = useLocation();
  const toast = useToast();

  const view = pathname.startsWith("/archive") ? "archived" : pathname.startsWith("/trash") ? "trash" : "active";
  const vital = pathname.startsWith("/vital");
  const label = pathname.startsWith("/label/") ? decodeURIComponent(pathname.slice(7)) : "";

  const [filters, setFilters] = useState({
    search: "",
    status: "All",
    priority: "All",
    sort: readPref("tf-sort", "newest")
  });
  const [layout, setLayoutState] = useState(readPref("tf-layout", "cards"));
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [stats, setStats] = useState(null);
  const [labels, setLabels] = useState([]);
  const [labelCounts, setLabelCounts] = useState([]);
  const [editing, setEditing] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);

  const tasksRef = useRef(tasks);
  useEffect(() => {
    tasksRef.current = tasks;
  }, [tasks]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(filters.search), 250);
    return () => clearTimeout(timer);
  }, [filters.search]);

  const setFilter = useCallback((key, value) => {
    setFilters(f => ({ ...f, [key]: value }));
    if (key === "sort") localStorage.setItem("tf-sort", value);
  }, []);

  const setLayout = useCallback(value => {
    setLayoutState(value);
    localStorage.setItem("tf-layout", value);
  }, []);

  // ----- loading -----
  const requestId = useRef(0);
  const lastViewKey = useRef(null);
  const hadError = useRef(false);
  const viewKey = `${view}|${label}|${vital}`;
  useEffect(() => {
    const id = ++requestId.current;
    const params = new URLSearchParams({ view, sort: filters.sort });
    if (debouncedSearch) params.set("search", debouncedSearch);
    if (filters.status !== "All") params.set("status", filters.status);
    const priority = vital ? "High" : filters.priority;
    if (priority !== "All") params.set("priority", priority);
    if (label) params.set("label", label);

    // Show skeletons only when the view changes (or after an error). Filter changes and
    // refreshes keep the current list on screen so the UI never flickers.
    if (lastViewKey.current !== viewKey || hadError.current) {
      lastViewKey.current = viewKey;
      hadError.current = false;
      setTasks(list => (list.length ? [] : list));
      setLoading(true);
    }
    setError("");
    api
      .get(`/tasks?${params}`)
      .then(data => id === requestId.current && setTasks(data.tasks))
      .catch(err => {
        if (id !== requestId.current) return;
        hadError.current = true;
        setError(err.message);
      })
      .finally(() => id === requestId.current && setLoading(false));
  }, [viewKey, view, label, vital, debouncedSearch, filters.status, filters.priority, filters.sort, reloadKey]);

  const refreshMeta = useCallback(() => {
    api.get(`/tasks/stats?tz=${new Date().getTimezoneOffset()}`).then(setStats).catch(() => {});
    api.get("/tasks/labels").then(data => {
        setLabels(data.labels);
        setLabelCounts(data.counts || []);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    refreshMeta();
  }, [refreshMeta]);

  const reload = useCallback(() => setReloadKey(k => k + 1), []);

  const belongs = useCallback(
    task =>
      view === "trash"
        ? Boolean(task.trashedAt)
        : !task.trashedAt && task.archived === (view === "archived") && (!label || task.labels.includes(label)) && (!vital || task.priority === "High"),
    [view, label, vital]
  );

  const upsert = useCallback(
    task =>
      setTasks(list => {
        const exists = list.some(t => t._id === task._id);
        if (!belongs(task)) return list.filter(t => t._id !== task._id);
        return exists ? list.map(t => (t._id === task._id ? task : t)) : [task, ...list];
      }),
    [belongs]
  );

  // ----- actions -----
  const create = useCallback(
    async input => {
      const { task } = await api.post("/tasks", input);
      upsert(task);
      refreshMeta();
      return task;
    },
    [upsert, refreshMeta]
  );

  const update = useCallback(
    async (id, patch) => {
      const previous = tasksRef.current.find(t => t._id === id);
      setTasks(list => list.map(t => (t._id === id ? { ...t, ...patch } : t)));
      try {
        const data = await api.patch(`/tasks/${id}`, patch);
        upsert(data.task);
        if (data.next) {
          upsert(data.next);
          toast(`Repeats ${data.next.repeat}. Next one is scheduled.`);
        }
        refreshMeta();
        return data.task;
      } catch (err) {
        if (previous) setTasks(list => list.map(t => (t._id === id ? previous : t)));
        toast(err.message, { tone: "error" });
        throw err;
      }
    },
    [upsert, refreshMeta, toast]
  );

  const restore = useCallback(
    async id => {
      try {
        const { task } = await api.post(`/tasks/${id}/restore`);
        upsert(task);
        reload();
        refreshMeta();
      } catch (err) {
        toast(err.message, { tone: "error" });
      }
    },
    [upsert, reload, refreshMeta, toast]
  );

  const trash = useCallback(
    async id => {
      try {
        await api.del(`/tasks/${id}`);
        setTasks(list => list.filter(t => t._id !== id));
        refreshMeta();
        toast("Moved to trash", { action: { label: "Undo", onClick: () => restore(id) } });
      } catch (err) {
        toast(err.message, { tone: "error" });
      }
    },
    [refreshMeta, restore, toast]
  );

  const removeForever = useCallback(
    async id => {
      try {
        await api.del(`/tasks/${id}/permanent`);
        setTasks(list => list.filter(t => t._id !== id));
        toast("Deleted forever");
      } catch (err) {
        toast(err.message, { tone: "error" });
      }
    },
    [toast]
  );

  const emptyTrash = useCallback(async () => {
    try {
      await api.del("/tasks/trash");
      setTasks([]);
      toast("Trash emptied");
    } catch (err) {
      toast(err.message, { tone: "error" });
    }
  }, [toast]);

  const bulk = useCallback(
    async (action, ids, extra = {}) => {
      try {
        const { affected } = await api.post("/tasks/bulk", { ids, action, ...extra });
        reload();
        refreshMeta();
        return affected;
      } catch (err) {
        toast(err.message, { tone: "error" });
        return 0;
      }
    },
    [reload, refreshMeta, toast]
  );

  const logFocus = useCallback(
    async (id, minutes) => {
      try {
        const { task } = await api.post(`/tasks/${id}/focus`, { minutes });
        upsert(task);
        refreshMeta();
      } catch {
        /* focus logging is best-effort */
      }
    },
    [upsert, refreshMeta]
  );

  const value = useMemo(
    () => ({
      view, label, filters, setFilter, layout, setLayout, tasks, loading, error, stats, labels, labelCounts,
      editing, setEditing, reload, create, update, trash, restore, removeForever, emptyTrash, bulk, logFocus
    }),
    [
      view, label, filters, setFilter, layout, setLayout, tasks, loading, error, stats, labels, labelCounts,
      editing, reload, create, update, trash, restore, removeForever, emptyTrash, bulk, logFocus
    ]
  );

  return <TasksContext.Provider value={value}>{children}</TasksContext.Provider>;
}

export const useTasks = () => useContext(TasksContext);
