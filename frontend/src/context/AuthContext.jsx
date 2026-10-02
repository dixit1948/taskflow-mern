import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { api, hooks } from "../api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    hooks.onUnauthorized = () => setUser(null);
    api
      .get("/auth/me")
      .then(data => setUser(data.user))
      .catch(() => setUser(null))
      .finally(() => setReady(true));
    return () => {
      hooks.onUnauthorized = null;
    };
  }, []);

  const value = useMemo(
    () => ({
      user,
      ready,
      login: async body => setUser((await api.post("/auth/login", body)).user),
      register: async body => setUser((await api.post("/auth/register", body)).user),
      updateName: async name => setUser((await api.patch("/auth/me", { name })).user),
      logout: async () => {
        try {
          await api.post("/auth/logout");
        } finally {
          setUser(null);
        }
      }
    }),
    [user, ready]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
