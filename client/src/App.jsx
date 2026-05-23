import { MetricsOverview } from "./components/MetricsOverview.jsx";
import { TrafficChart } from "./components/TrafficChart.jsx";
import { ScoreHistogram } from "./components/ScoreHistogram.jsx";
import { OffendingIpsTable } from "./components/OffendingIpsTable.jsx";
import { SignalBreakdown } from "./components/SignalBreakdown.jsx";
import { WhitelistPanel } from "./components/WhitelistPanel.jsx";
import { ProtectedEndpointTest } from "./components/ProtectedEndpointTest.jsx";

export function App() {
  return (
    <main className="app-shell">
      <header className="hero-section">
        {/* Floating Sketches */}
        <div className="floating-sketch sketch-1">
          <span className="icon-red">&lt;/&gt;</span> CODE
        </div>
        <div className="floating-sketch sketch-2">
          <span className="icon-red">429</span> BLOCKED
        </div>
        <div className="floating-sketch sketch-3">
          <span className="icon-red">BOT?</span>
        </div>
        <div className="floating-sketch sketch-4">
          <span className="icon-red">ALERT</span>
        </div>
        <div className="floating-sketch sketch-5">
          <span className="icon-red">JS</span>
        </div>
        <div className="floating-sketch sketch-6">
          <span className="icon-red">SHIELD</span>
        </div>

        <span className="hero-pill">Live Prototype · Bot Shield Online</span>
        <h1 className="hero-title">Aiee</h1>
        <p className="hero-subtitle">Smart bot detection for protected compensation APIs.</p>
        
        <div className="hero-status-pills">
          <span className="status-pill active">Backend online</span>
          <span className="status-pill">Challenge mode active</span>
          <span className="status-pill">In-memory defense</span>
        </div>
      </header>

      <MetricsOverview />
      
      <section className="dashboard-grid">
        <TrafficChart />
        <ScoreHistogram />
        <SignalBreakdown />
        <OffendingIpsTable />
        <ProtectedEndpointTest />
        <WhitelistPanel />
      </section>
    </main>
  );
}
