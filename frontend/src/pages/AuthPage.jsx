import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Check, Eye, EyeOff } from "lucide-react";
import { useAuth } from "../context/AuthContext";

export default function AuthPage({ mode }) {
  const isLogin = mode === "login";
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [show, setShow] = useState(false);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [busy, setBusy] = useState(false);

  const set = (key, value) => {
    setForm(f => ({ ...f, [key]: value }));
    setErrors(e => ({ ...e, [key]: undefined }));
  };

  const rules = [
    ["At least 8 characters", form.password.length >= 8],
    ["A letter", /[A-Za-z]/.test(form.password)],
    ["A number", /\d/.test(form.password)]
  ];

  const validate = () => {
    const e = {};
    if (!isLogin && form.name.trim().length < 2) e.name = "Enter your name";
    if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) e.email = "Enter a valid email address";
    if (isLogin && !form.password) e.password = "Enter your password";
    if (!isLogin && rules.some(([, ok]) => !ok)) e.password = "Use 8+ characters with a letter and a number";
    return e;
  };

  const submit = async e => {
    e.preventDefault();
    const found = validate();
    setErrors(found);
    if (Object.keys(found).length) return;
    setBusy(true);
    setFormError("");
    try {
      if (isLogin) await login({ email: form.email.trim(), password: form.password });
      else await register({ name: form.name.trim(), email: form.email.trim(), password: form.password });
      navigate(location.state?.from || "/", { replace: true });
    } catch (err) {
      const fields = err.fields || {};
      setErrors(fields);
      if (!Object.keys(fields).length) setFormError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth">
      <aside className="auth-side">
        <div className="logo logo-light"><span>Task</span>Flow</div>
        <div>
          <h2>Plan your day in one line.</h2>
          <p>Type it the way you'd say it. TaskFlow finds the date, priority and label for you.</p>
          <div className="demo">
            <p className="demo-input">Pay rent tomorrow 5pm !high #bills</p>
            <div className="chips">
              <span className="chip">Pay rent</span>
              <span className="chip">Tomorrow, 5:00 PM</span>
              <span className="chip">High</span>
              <span className="chip">#bills</span>
            </div>
          </div>
        </div>
      </aside>

      <main className="auth-main">
        <form className="auth-card" onSubmit={submit} noValidate>
          <h1>{isLogin ? "Welcome back" : "Create your account"}</h1>
          <p className="muted">{isLogin ? "Log in to see today's tasks." : "Free, private, and ready in a minute."}</p>

          {formError && <p className="form-error" role="alert">{formError}</p>}

          {!isLogin && (
            <div className="field">
              <label htmlFor="name">Name</label>
              <input id="name" value={form.name} autoComplete="name" onChange={e => set("name", e.target.value)} aria-invalid={Boolean(errors.name)} aria-describedby={errors.name ? "name-error" : undefined} autoFocus />
              {errors.name && <small id="name-error" className="field-error" role="alert">{errors.name}</small>}
            </div>
          )}

          <div className="field">
            <label htmlFor="email">Email</label>
            <input id="email" type="email" value={form.email} autoComplete="email" onChange={e => set("email", e.target.value)} aria-invalid={Boolean(errors.email)} aria-describedby={errors.email ? "email-error" : undefined} autoFocus={isLogin} />
            {errors.email && <small id="email-error" className="field-error" role="alert">{errors.email}</small>}
          </div>

          <div className="field">
            <label htmlFor="password">Password</label>
            <div className="password">
              <input
                id="password"
                type={show ? "text" : "password"}
                value={form.password}
                autoComplete={isLogin ? "current-password" : "new-password"}
                onChange={e => set("password", e.target.value)}
                aria-invalid={Boolean(errors.password)}
                aria-describedby={errors.password ? "password-error" : undefined}
              />
              <button type="button" className="icon-btn" onClick={() => setShow(s => !s)} aria-label={show ? "Hide password" : "Show password"}>
                {show ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {errors.password && <small id="password-error" className="field-error" role="alert">{errors.password}</small>}
          </div>

          {!isLogin && (
            <ul className="rules" aria-label="Password requirements">
              {rules.map(([text, ok]) => (
                <li key={text} className={ok ? "ok" : ""}>
                  <Check size={14} aria-hidden="true" /> {text}
                </li>
              ))}
            </ul>
          )}

          <button className="btn btn-primary btn-block" disabled={busy}>
            {busy ? (isLogin ? "Logging in" : "Creating account") : isLogin ? "Log in" : "Create account"}
          </button>

          <p className="auth-switch">
            {isLogin ? "New to TaskFlow? " : "Already have an account? "}
            <Link to={isLogin ? "/register" : "/login"} state={location.state}>{isLogin ? "Create an account" : "Log in"}</Link>
          </p>
        </form>
      </main>
    </div>
  );
}
