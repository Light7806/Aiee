import { request, printResult, getBaseUrl, sleep } from "./shared/client.js";
import { humanUserAgents } from "./shared/userAgents.js";

const TARGET_UUID = "8199449f-7a0d-4f83-9427-bdaeae2d507a";

async function run() {
  console.log("Aiee Human Simulator");
  console.log(`Target: ${getBaseUrl()}`);
  console.log("");
  
  let totalRequests = 0;
  let allowedCount = 0;
  let challengedCount = 0;
  let blockedCount = 0;
  let serverOffline = false;

  const trackResult = (res) => {
    totalRequests++;
    if (res.error) serverOffline = true;
    else if (res.status === 200) allowedCount++;
    else if (res.status === 403) challengedCount++;
    else if (res.status === 429) blockedCount++;
  };

  const ua = humanUserAgents[0];

  for (let i = 1; i <= 5; i++) {
    const res = await request(`/api/compensation/${TARGET_UUID}`, {
      headers: {
        "User-Agent": ua,
        "x-aiee-js-beacon": "valid",
        "x-aiee-interaction": "true",
        "x-forwarded-for": "198.51.100.20"
      }
    });
    
    trackResult(res);
    if (serverOffline) break;
    printResult(`[${i}]`, res);
    
    if (i < 5) {
      const delay = Math.floor(Math.random() * 700) + 500; // 500-1200ms
      await sleep(delay);
    }
  }

  if (serverOffline) {
    console.error("\nCould not reach Aiee server. Start it with npm run server.");
    process.exit(1);
  }

  console.log(`\nSummary: ${allowedCount} allowed, ${challengedCount} challenged, ${blockedCount} blocked`);
  
  if (allowedCount === 5) {
    console.log("Demo outcome: PASS");
    process.exit(0);
  } else {
    console.log("Demo outcome: FAIL (Did not see 100% allowed behavior)");
    process.exit(1);
  }
}

run().catch(console.error);
