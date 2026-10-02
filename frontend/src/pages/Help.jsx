const SYNTAX = [
  ["Pay rent tomorrow 5pm", "Due tomorrow at 5:00 PM"],
  ["Submit report on Oct 5", "Due on 5 October"],
  ["Call mom in 2 hours", "Due in two hours, with a reminder"],
  ["Team sync every monday 10am", "Repeats weekly, next on Monday"],
  ["Renew passport !high #personal", "High priority, label “personal”"],
  ["Gym tonight every day", "Repeats daily, due 8:00 PM"]
];

const KEYS = [
  ["N", "Add a new task"],
  ["/", "Search tasks"],
  ["Ctrl / ⌘ + K", "Command palette"],
  ["Ctrl / ⌘ + Enter", "Save the task you're editing"],
  ["Esc", "Close dialogs and menus"]
];

export default function Help() {
  return (
    <div className="page narrow">
      <header className="page-head">
        <div>
          <h1>Help</h1>
          <p className="muted">Get more done with fewer clicks.</p>
        </div>
      </header>

      <section className="panel">
        <header className="panel-head"><h2>Quick add understands plain language</h2></header>
        <p className="muted pad-b">Type everything in one line. Dates, times, priority, labels and repeats are picked out for you and shown before you press Enter.</p>
        <table className="help-table">
          <tbody>
            {SYNTAX.map(([a, b]) => (
              <tr key={a}><th scope="row">{a}</th><td>{b}</td></tr>
            ))}
          </tbody>
        </table>
        <p className="muted pad-t"><b>!high</b>, <b>!med</b>, <b>!low</b> set priority. <b>#word</b> adds a label.</p>
      </section>

      <section className="panel">
        <header className="panel-head"><h2>Keyboard shortcuts</h2></header>
        <table className="help-table">
          <tbody>
            {KEYS.map(([a, b]) => (
              <tr key={a}><th scope="row"><kbd>{a}</kbd></th><td>{b}</td></tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="panel">
        <header className="panel-head"><h2>Good to know</h2></header>
        <ul className="plain-list">
          <li>Tap the circle on a task to move it from Not Started to In Progress to Completed.</li>
          <li>On the board view in My Task, drag a card between columns to change its status.</li>
          <li>Deleted tasks stay in Trash for 30 days, so you can always undo.</li>
          <li>Completing a repeating task schedules the next one automatically.</li>
          <li>Start a focus session from a task's ⋯ menu. Time is logged on the task.</li>
        </ul>
      </section>
    </div>
  );
}
