export default function Donut({ value, color, label }) {
  const r = 34;
  const c = 2 * Math.PI * r;
  return (
    <div className="donut">
      <div className="donut-ring">
        <svg viewBox="0 0 84 84" role="img" aria-label={`${label}: ${value}%`}>
          <circle cx="42" cy="42" r={r} className="donut-track" />
          <circle
            cx="42" cy="42" r={r}
            className="donut-bar"
            style={{ stroke: color, strokeDasharray: `${(c * value) / 100} ${c}` }}
            transform="rotate(-90 42 42)"
          />
        </svg>
        <span className="donut-val">{value}%</span>
      </div>
      <span className="donut-label"><i style={{ background: color }} />{label}</span>
    </div>
  );
}
