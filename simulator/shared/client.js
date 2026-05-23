export function getBaseUrl() {
  return process.env.AIEE_BASE_URL || "http://127.0.0.1:3000";
}

export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function request(path, options = {}) {
  const url = `${getBaseUrl()}${path}`;
  try {
    const res = await fetch(url, options);
    const bodyText = await res.text();
    let json = null;
    try {
      json = JSON.parse(bodyText);
    } catch (e) {
      // Ignore if not JSON
    }
    
    return {
      status: res.status,
      headers: res.headers,
      bodyText,
      json,
      error: null
    };
  } catch (error) {
    return {
      error: error.message || "Fetch failed"
    };
  }
}

export function printResult(label, result) {
  if (result.error) {
    console.log(`${label} Error: ${result.error}`);
    return;
  }
  
  // Extract score from headers if present
  let scoreStr = "";
  const score = result.headers.get("x-aiee-score");
  if (score) {
    scoreStr = ` score=${score}`;
  }
  
  let statusText = "unknown";
  if (result.status === 200) statusText = "allow";
  else if (result.status === 403) statusText = "challenge";
  else if (result.status === 429) statusText = "block";
  else statusText = `status=${result.status}`;
  
  console.log(`${label} ${result.status} ${statusText}${scoreStr}`);
}
