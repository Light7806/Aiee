// Client API wrapper for dashboard analytics.

export async function fetchLiveAnalytics() {
  const response = await fetch("/api/analytics/live");
  return response.json();
}
