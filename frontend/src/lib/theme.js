import { useSyncExternalStore } from "react";

const subscribe = callback => {
  const observer = new MutationObserver(callback);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  return () => observer.disconnect();
};

export function useTheme() {
  const theme = useSyncExternalStore(subscribe, () => document.documentElement.dataset.theme || "light");
  const setTheme = next => {
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem("tf-theme", next);
    } catch {
      /* private mode */
    }
  };
  return [theme, () => setTheme(theme === "dark" ? "light" : "dark"), setTheme];
}
