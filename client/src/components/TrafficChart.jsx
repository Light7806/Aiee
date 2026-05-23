export function TrafficChart() {
  const bars = [
    { label: "10am", allow: 40, challenge: 10, block: 5 },
    { label: "11am", allow: 60, challenge: 15, block: 8 },
    { label: "12pm", allow: 80, challenge: 40, block: 100 }, // Burst
    { label: "1pm", allow: 45, challenge: 5, block: 2 },
    { label: "2pm", allow: 50, challenge: 8, block: 4 },
  ];

  return (
    <article className="panel">
      <h2>Traffic Volume (Mock)</h2>
      <p>Simulated request volume by hour and decision.</p>
      
      <div className="v-chart">
        {bars.map((b, i) => (
          <div key={i} className="v-bar-group">
            {b.block > 0 && <div className="v-bar block" style={{ height: `${b.block}px` }}></div>}
            {b.challenge > 0 && <div className="v-bar challenge" style={{ height: `${b.challenge}px` }}></div>}
            <div className="v-bar allow" style={{ height: `${b.allow}px` }}></div>
            <span className="v-label">{b.label}</span>
          </div>
        ))}
      </div>
    </article>
  );
}
