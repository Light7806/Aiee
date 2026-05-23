export function ScoreHistogram() {
  return (
    <article className="panel">
      <h2>Risk Score Distribution</h2>
      <p>Most traffic should be under 30. High scores indicate bot pressure.</p>
      <br/>
      
      <div className="bar-row">
        <div className="bar-label-row">
          <span>0 - 29 (Allow)</span>
          <span>912 reqs</span>
        </div>
        <div className="bar-track">
          <div className="bar-fill" style={{ width: "71%" }}></div>
        </div>
      </div>
      
      <div className="bar-row">
        <div className="bar-label-row">
          <span>30 - 69 (Challenge)</span>
          <span>221 reqs</span>
        </div>
        <div className="bar-track">
          <div className="bar-fill yellow" style={{ width: "17%" }}></div>
        </div>
      </div>
      
      <div className="bar-row">
        <div className="bar-label-row">
          <span>70 - 100 (Block)</span>
          <span>151 reqs</span>
        </div>
        <div className="bar-track">
          <div className="bar-fill red" style={{ width: "12%" }}></div>
        </div>
      </div>
    </article>
  );
}
