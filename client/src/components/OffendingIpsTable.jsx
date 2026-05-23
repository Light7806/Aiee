export function OffendingIpsTable() {
  const rows = [
    { ip: "103.44.21.8", reqs: 184, score: 92, status: "Blocked", css: "blocked" },
    { ip: "88.19.20.4", reqs: 77, score: 64, status: "Challenged", css: "challenged" },
    { ip: "192.168.1.15", reqs: 55, score: 85, status: "Blocked", css: "blocked" },
    { ip: "66.249.66.1", reqs: 42, score: 0, status: "Whitelisted", css: "whitelisted" },
  ];

  return (
    <article className="panel">
      <h2>Top Offending IPs</h2>
      <p>IPs generating the highest risk scores recently.</p>
      
      <table className="data-table">
        <thead>
          <tr>
            <th>IP Address</th>
            <th>Reqs</th>
            <th>Avg Score</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              <td><strong>{r.ip}</strong></td>
              <td>{r.reqs}</td>
              <td>{r.score}</td>
              <td><span className={`status-badge ${r.css}`}>{r.status}</span></td>
            </tr>
          ))}
        </tbody>
      </table>
    </article>
  );
}
