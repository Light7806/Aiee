export function MetricsOverview() {
  return (
    <div className="metrics-row">
      <div className="metric-card">
        <span className="metric-label">Total Requests</span>
        <span className="metric-value">1,284</span>
      </div>
      <div className="metric-card">
        <span className="metric-label">Allowed</span>
        <span className="metric-value">912</span>
      </div>
      <div className="metric-card">
        <span className="metric-label">Challenged</span>
        <span className="metric-value">221</span>
      </div>
      <div className="metric-card">
        <span className="metric-label">Blocked</span>
        <span className="metric-value red">151</span>
      </div>
      <div className="metric-card">
        <span className="metric-label">Current Bot Pressure</span>
        <span className="metric-value red">High</span>
      </div>
    </div>
  );
}
