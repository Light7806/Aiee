import { useState } from "react";

export function ProtectedEndpointTest() {
  const [logs, setLogs] = useState([]);
  const [isRunning, setIsRunning] = useState(false);
  const TARGET_URL = "/api/compensation/8199449f-7a0d-4f83-9427-bdaeae2d507a";

  const addLog = (message, state) => {
    setLogs(prev => [...prev, { message, state }]);
  };

  const runSingleTest = async (label, headers) => {
    setLogs([]);
    addLog(`Sending ${label}...`, "");
    try {
      const res = await fetch(TARGET_URL, { headers });
      const score = res.headers.get("x-aiee-score") || "??";
      
      let state = "";
      if (res.status === 200) state = "allow";
      else if (res.status === 403) state = "challenge";
      else if (res.status === 429) state = "block";
      
      addLog(`[${res.status}] Risk score: ${score}`, state);
    } catch (e) {
      addLog(`Error: Could not reach server. Is npm run server running?`, "block");
    }
  };

  const runBotSimulator = async () => {
    setLogs([]);
    setIsRunning(true);
    addLog("Starting Bot Simulator (12 rapid requests)...", "");
    
    // Generate a random IP for this simulation run
    const simIp = `203.0.113.${Math.floor(Math.random() * 255)}`;

    for (let i = 1; i <= 12; i++) {
      try {
        const res = await fetch(TARGET_URL, {
          headers: {
            "User-Agent": "python-requests/2.31.0",
            "x-forwarded-for": simIp
          }
        });
        const score = res.headers.get("x-aiee-score") || "??";
        let state = res.status === 200 ? "allow" : (res.status === 403 ? "challenge" : "block");
        addLog(`[Request ${i}] ${res.status} — Score: ${score}`, state);
      } catch (e) {
        addLog(`Error: Server unreachable.`, "block");
        break;
      }
      // Small delay so the UI updates
      await new Promise(r => setTimeout(r, 100));
    }
    
    addLog("Simulator complete.", "");
    setIsRunning(false);
  };

  const testHuman = () => {
    runSingleTest("Human Request", {
      "User-Agent": "Mozilla/5.0 Chrome/120 Safari/537.36",
      "x-aiee-js-beacon": "valid",
      "x-aiee-interaction": "true"
    });
  };

  const testSuspicious = () => {
    runSingleTest("Suspicious Request", {
      "User-Agent": "python-requests/2.31.0"
    });
  };

  return (
    <article className="panel">
      <h2>Test Protected Endpoint</h2>
      <p>Live testing for <strong>GET /api/compensation/:uuid</strong></p>
      
      <div className="test-actions">
        <button className="btn" onClick={testHuman} disabled={isRunning}>1x Human</button>
        <button className="btn" onClick={testSuspicious} disabled={isRunning}>1x Suspicious</button>
        <button className="btn btn-primary" onClick={runBotSimulator} disabled={isRunning}>🔥 Run Bot Simulator (12x)</button>
      </div>

      {logs.length > 0 && (
        <div className="test-result-box" style={{ maxHeight: "250px", overflowY: "auto", fontSize: "14px" }}>
          {logs.map((log, i) => (
            <div key={i} className={log.state} style={{ 
              padding: "4px 8px", 
              marginBottom: "4px", 
              borderRadius: "4px",
              backgroundColor: log.state === "allow" ? "#111" : (log.state === "challenge" ? "#ffeb3b" : (log.state === "block" ? "#e43d30" : "transparent")),
              color: log.state === "challenge" || !log.state ? "#111" : "#fff"
            }}>
              &gt; {log.message}
            </div>
          ))}
        </div>
      )}
    </article>
  );
}
