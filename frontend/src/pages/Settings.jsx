import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { useTheme } from "../lib/theme";

export default function Settings() {
  const { user, updateName, logout } = useAuth();
  const toast = useToast();
  const [theme, , setTheme] = useTheme();
  const [name, setName] = useState(user.name);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const save = async e => {
    e.preventDefault();
    if (name.trim().length < 2) return setError("Name must be at least 2 characters");
    setBusy(true);
    setError("");
    try {
      await updateName(name.trim());
      toast("Profile updated");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="page narrow">
      <header className="page-head">
        <div>
          <h1>Settings</h1>
          <p className="muted">Manage your profile and how TaskFlow looks.</p>
        </div>
      </header>

      <section className="panel">
        <header className="panel-head"><h2>Profile</h2></header>
        <form className="form" onSubmit={save}>
          <div className="field">
            <label htmlFor="settings-name">Name</label>
            <input id="settings-name" value={name} maxLength={50} onChange={e => setName(e.target.value)} aria-describedby={error ? "settings-name-error" : undefined} />
            {error && <small id="settings-name-error" className="field-error" role="alert">{error}</small>}
          </div>
          <div className="field">
            <label htmlFor="settings-email">Email</label>
            <input id="settings-email" value={user.email} disabled />
          </div>
          <div><button className="btn btn-primary" disabled={busy || name.trim() === user.name}>{busy ? "Saving" : "Save changes"}</button></div>
        </form>
      </section>

      <section className="panel">
        <header className="panel-head"><h2>Appearance</h2></header>
        <div className="segmented" role="radiogroup" aria-label="Theme">
          {["light", "dark"].map(t => (
            <button key={t} role="radio" aria-checked={theme === t} className={theme === t ? "on" : ""} onClick={() => setTheme(t)}>
              {t === "light" ? "Light" : "Dark"}
            </button>
          ))}
        </div>
      </section>

      <section className="panel">
        <header className="panel-head"><h2>Session</h2></header>
        <p className="muted pad-b">You stay signed in on this device for 7 days.</p>
        <button className="btn btn-danger-outline" onClick={logout}>Log out</button>
      </section>
    </div>
  );
}
