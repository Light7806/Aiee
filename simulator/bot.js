import { request, printResult, getBaseUrl, sleep } from "./shared/client.js";

const TARGET_UUID = "8199449f-7a0d-4f83-9427-bdaeae2d507a";

async function run() {
  console.log("Aiee Bot Simulator");
  console.log(`Target: ${getBaseUrl()}`);
  console.log("");
  
  let totalRequests = 0;
  let challengedCount = 0;
  let blockedCount = 0;
  let serverOffline = false;

  const trackResult = (res) => {
    totalRequests++;
    if (res.error) serverOffline = true;
    else if (res.status === 403) challengedCount++;
    else if (res.status === 429) blockedCount++;
  };

  // Profile 1: Burst bot
  console.log("Burst bot:");
  for (let i = 1; i <= 12; i++) {
    const res = await request(`/api/compensation/${TARGET_UUID}`, {
      headers: {
        "User-Agent": "python-requests/2.31.0",
        "x-forwarded-for": "203.0.113.10"
      }
    });
    trackResult(res);
    if (serverOffline) break;
    printResult(`[${i}]`, res);
  }

  if (!serverOffline) {
    console.log("");
    // Profile 2: Sequential scraper
    console.log("Sequential scraper:");
    const paths = ["/api/compensation/1", "/api/compensation/2", "/api/compensation/3"];
    for (const path of paths) {
      const res = await request(path, {
        headers: {
          "User-Agent": "python-requests/2.31.0",
          "x-forwarded-for": "203.0.113.11"
        }
      });
      trackResult(res);
      if (serverOffline) break;
      printResult(`[${path}]`, res);
    }
  }

  if (serverOffline) {
    console.error("\nCould not reach Aiee server. Start it with npm run server.");
    process.exit(1);
  }

  console.log("\nSummary: " + totalRequests + " total requests, " + challengedCount + " challenged, " + blockedCount + " blocked");
  
  // Validate expectations: Burst bot should eventually block, sequential scraper should end up blocked.
  const passed = blockedCount >= 2 && challengedCount > 0;
  
  if (passed) {
    console.log("Demo outcome: PASS");
    process.exit(0);
  } else {
    console.log("Demo outcome: FAIL (Did not see expected challenge/block behavior)");
    process.exit(1);
  }
}

run().catch(console.error);
