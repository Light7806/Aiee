export function SignalBreakdown() {
  const signals = [
    { name: "High Request Rate", pct: 65, color: "red" },
    { name: "Suspicious UA", pct: 42, color: "red" },
    { name: "Missing JS Beacon", pct: 38, color: "yellow" },
    { name: "Sequential URLs", pct: 25, color: "red" },
    { name: "Regular Timing", pct: 15, color: "yellow" },
    { name: "No Interaction", pct: 10, color: "black" },
  ];

  return (
    <article className="panel">
      <h2>Signal Breakdown</h2>
      <p>Which detectors are firing the most?</p>
      <br/>
      
      {signals.map((s, i) => (
        <div className="bar-row" key={i}>
          <div className="bar-label-row">
            <span>{s.name}</span>
            <span>{s.pct}%</span>
          </div>
          <div className="bar-track">
            <div className={`bar-fill ${s.color === "black" ? "" : s.color}`} style={{ width: `${s.pct}%` }}></div>
          </div>
        </div>
      ))}
    </article>
  );
}
