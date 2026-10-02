import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useTasks } from "./TasksContext";
import { useToast } from "./ToastContext";
import { alarm } from "../lib/alarm";

const FocusContext = createContext(null);

export const notify = (title, body) => {
  if ("Notification" in window && Notification.permission === "granted") {
    new Notification(title, { body, icon: "/favicon.svg" });
  }
};

export const formatClock = ms => {
  const total = Math.ceil(ms / 1000);
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
};

export function FocusProvider({ children }) {
  const { logFocus } = useTasks();
  const toast = useToast();
  const [session, setSession] = useState(null); // { taskId, title, minutes, endsAt, pausedLeft }
  const [alarmActive, setAlarmActive] = useState(null); // { taskId, title, minutes }
  const [promptTask, setPromptTask] = useState(null); // task to choose focus duration for
  const [now, setNow] = useState(() => Date.now());

  const running = session && session.pausedLeft == null;
  const left = session ? (session.pausedLeft ?? Math.max(0, session.endsAt - now)) : 0;

  useEffect(() => {
    if (!running) return;
    const timer = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(timer);
  }, [running]);

  // Cleanup alarm on unmount
  useEffect(() => {
    return () => alarm.stop();
  }, []);

  const dismissAlarm = useCallback(() => {
    alarm.stop();
    setAlarmActive(null);
  }, []);

  const finish = useCallback(
    completed => {
      if (!session) return;
      const remaining = session.pausedLeft ?? Math.max(0, session.endsAt - Date.now());
      const minutes = completed ? session.minutes : Math.floor(session.minutes - remaining / 60_000);
      if (minutes >= 1) logFocus(session.taskId, minutes);

      const title = session.title;
      const taskId = session.taskId;
      setSession(null);

      if (completed) {
        toast(`Focus session complete. ${minutes} min logged.`);
        notify("Focus session complete", title);
        alarm.start();
        setAlarmActive({ taskId, title, minutes });
      } else if (minutes >= 1) {
        toast(`${minutes} min of focus logged.`);
      }
    },
    [session, logFocus, toast]
  );

  useEffect(() => {
    if (running && left <= 0) finish(true);
  }, [running, left, finish]);

  useEffect(() => {
    if (!session) return;
    const original = document.title;
    document.title = `${formatClock(left)} · ${session.title}`;
    return () => {
      document.title = original;
    };
  }, [session, left]);

  const value = useMemo(
    () => ({
      session,
      left,
      alarmActive,
      dismissAlarm,
      promptTask,
      openPrompt: setPromptTask,
      closePrompt: () => setPromptTask(null),
      start: (task, minutes = 25) => {
        dismissAlarm();
        setPromptTask(null);
        setNow(Date.now());
        setSession({ taskId: task._id, title: task.title, minutes, endsAt: Date.now() + minutes * 60_000, pausedLeft: null });
      },
      pause: () => setSession(s => s && { ...s, pausedLeft: Math.max(0, s.endsAt - Date.now()) }),
      resume: () => setSession(s => s && { ...s, endsAt: Date.now() + s.pausedLeft, pausedLeft: null }),
      stop: () => finish(false)
    }),
    [session, left, alarmActive, dismissAlarm, promptTask, finish]
  );

  return <FocusContext.Provider value={value}>{children}</FocusContext.Provider>;
}

export const useFocus = () => useContext(FocusContext);
