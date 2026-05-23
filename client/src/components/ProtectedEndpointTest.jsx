import { useState } from "react";

export function ProtectedEndpointTest() {
  const [result, setResult] = useState(null);
  const [resultState, setResultState] = useState("");

  const testHuman = () => {
    setResult("200 OK — Allowed. Risk score: 10");
    setResultState("allow");
  };

  const testSuspicious = () => {
    setResult("403 Forbidden — Challenge Required. Risk score: 45");
    setResultState("challenge");
  };

  const testBot = () => {
    setResult("429 Too Many Requests — Blocked. Risk score: 95");
    setResultState("block");
  };

  return (
    <article className="panel">
      <h2>Test Protected Endpoint</h2>
      <p>Mock testing for <strong>GET /api/compensation/:uuid</strong></p>
      
      <div className="test-actions">
        <button className="btn" onClick={testHuman}>Human Request</button>
        <button className="btn" onClick={testSuspicious}>Suspicious</button>
        <button className="btn btn-primary" onClick={testBot}>Bot Burst</button>
      </div>

      {result && (
        <div className={`test-result-box ${resultState}`}>
          &gt; {result}
        </div>
      )}
    </article>
  );
}
