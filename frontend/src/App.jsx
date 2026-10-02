import { Navigate, Outlet, Route, Routes, useLocation } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import Shell from "./components/Shell";
import AuthPage from "./pages/AuthPage";
import Dashboard from "./pages/Dashboard";
import Tasks from "./pages/Tasks";
import Categories from "./pages/Categories";
import Settings from "./pages/Settings";
import Help from "./pages/Help";

function Splash() {
  return (
    <div className="splash" role="status" aria-label="Loading">
      <div className="logo"><span>Task</span>Flow</div>
    </div>
  );
}

function RequireAuth() {
  const { user, ready } = useAuth();
  const location = useLocation();
  if (!ready) return <Splash />;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  return <Outlet />;
}

function PublicOnly() {
  const { user, ready } = useAuth();
  if (!ready) return <Splash />;
  return user ? <Navigate to="/" replace /> : <Outlet />;
}

export default function App() {
  return (
    <Routes>
      <Route element={<PublicOnly />}>
        <Route path="/login" element={<AuthPage mode="login" />} />
        <Route path="/register" element={<AuthPage mode="register" />} />
      </Route>

      <Route element={<RequireAuth />}>
        <Route element={<Shell />}>
          <Route index element={<Dashboard />} />
          <Route path="vital" element={<Tasks />} />
          <Route path="tasks" element={<Tasks />} />
          <Route path="archive" element={<Tasks />} />
          <Route path="trash" element={<Tasks />} />
          <Route path="label/:label" element={<Tasks />} />
          <Route path="categories" element={<Categories />} />
          <Route path="settings" element={<Settings />} />
          <Route path="help" element={<Help />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
