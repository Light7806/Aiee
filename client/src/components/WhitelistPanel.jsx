export function WhitelistPanel() {
  const bots = [
    { name: "Googlebot", protected: true },
    { name: "Bingbot", protected: true },
    { name: "DuckDuckBot", protected: true },
    { name: "AhrefsBot", protected: false },
  ];

  return (
    <article className="panel">
      <h2>Known Crawlers</h2>
      <p>Search engines bypassed via crawlerWhitelist.</p>
      
      <table className="data-table">
        <thead>
          <tr>
            <th>Crawler Name</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {bots.map((b, i) => (
            <tr key={i}>
              <td><strong>{b.name}</strong></td>
              <td>
                <span className={`status-badge ${b.protected ? "whitelisted" : "blocked"}`}>
                  {b.protected ? "Allowed" : "Blocked"}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </article>
  );
}
