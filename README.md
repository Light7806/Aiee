# Aiee: Smart Bot Detection & Defense 🛡️
Aiee is a mock prototype for a smart bot detection and anti-scraping defense system. It acts as an intelligent middleware shield that protects sensitive APIs by scoring traffic and challenging or blocking suspicious requests.

## Current Prototype Features
- **In-Memory Defense**: Tracks session history, request rates, and URL sequences without external dependencies.
- **Bot Detection**: 7 different detectors analyze User-Agent, JavaScript beacons, interactions, burst rates, sequential crawling, and timing variance.
- **Risk Scoring**: Evaluates signals to calculate a dynamic risk score.
- **Mitigation Pipeline**:
  - `Allow` (Score 0-29): Passes traffic normally.
  - `Challenge` (Score 30-69): Returns HTTP 403.
  - `Block` (Score 70-100): Returns HTTP 429.
- **Security Dashboard**: A responsive, hand-drawn-style frontend for monitoring mocked traffic metrics and testing API responses.

## Setup & Running

1. **Install Dependencies:**
   ```bash
   npm install
   ```

2. **Run the Backend Server:**
   ```bash
   npm run server
   ```
   *Runs on `http://127.0.0.1:3000`*

3. **Run the Dashboard:**
   ```bash
   npm run dashboard
   ```
   *Open `http://127.0.0.1:5173` in your browser.*

## Simulators (Demo Flow)

You can run automated traffic simulators to see Aiee in action. Ensure the server is running first in a separate terminal.

**Run the Human Simulator:**
```bash
npm run simulate:human
```
*Expected: 5 requests all allowed (200 OK).*

**Run the Bot Simulator:**
```bash
npm run simulate:bot
```
*Expected: Burst bot and Sequential scraper eventually blocked (429 Too Many Requests).*

## Manual Testing (cURL)

**Human Allowed:**
```bash
curl -i \
  -H "User-Agent: Mozilla/5.0 Chrome/120 Safari/537.36" \
  -H "x-aiee-js-beacon: valid" \
  -H "x-aiee-interaction: true" \
  http://127.0.0.1:3000/api/compensation/8199449f-7a0d-4f83-9427-bdaeae2d507a
```

**Suspicious Challenged:**
```bash
curl -i \
  -H "User-Agent: python-requests/2.31.0" \
  http://127.0.0.1:3000/api/compensation/8199449f-7a0d-4f83-9427-bdaeae2d507a
```

**Challenge Pass:**
```bash
curl -i \
  -H "User-Agent: python-requests/2.31.0" \
  -H "x-aiee-challenge-token: prototype-pass" \
  http://127.0.0.1:3000/api/compensation/8199449f-7a0d-4f83-9427-bdaeae2d507a
```

**Sequential Scraper Blocked:**
```bash
curl -i -H "User-Agent: python-requests/2.31.0" http://127.0.0.1:3000/api/compensation/1
curl -i -H "User-Agent: python-requests/2.31.0" http://127.0.0.1:3000/api/compensation/2
curl -i -H "User-Agent: python-requests/2.31.0" http://127.0.0.1:3000/api/compensation/3
```

## Prototype Headers

- `x-aiee-js-beacon`: Pass `valid` to prove JS execution capability.
- `x-aiee-interaction`: Pass `true` to mock user interaction (mouse moves, clicks).
- `x-aiee-challenge-token`: Pass `prototype-pass` to bypass a challenge state.
- `x-aiee-force-bot`: Pass `true` for temporary testing to force a block decision.
- `x-forwarded-for`: Used for local prototype/test isolation (IP spoofing for tests).

## Current Limitations

- **Storage**: Uses in-memory store only. No Redis persistence yet.
- **Challenge**: No real CAPTCHA or proof-of-work cryptographic challenge yet.
- **Whitelist**: Crawler verification is User-Agent-based only (no reverse DNS check yet).
- **Dashboard**: The frontend dashboard currently uses mocked data and is not connected to live analytics.
