# 🛡️ Aiee: Smart Bot Detection & Defense Middleware

![Aiee Dashboard Concept](https://img.shields.io/badge/Status-Prototype-orange) ![Stack](https://img.shields.io/badge/Stack-Node.js%20%7C%20React%20%7C%20Express-blue)

A complete, in-memory middleware prototype designed to intelligently protect sensitive APIs from automated scraping, scalping, and abuse. 

---

## 📖 The Problem (Why does this exist?)
Modern businesses—whether ticketing platforms, e-commerce sites, or proprietary databases—expose highly valuable data via APIs. Bad actors write automated scripts ("bots") to steal this data faster than any human could. 

If left undefended, these bots cause massive damage:
* 📉 **Data Theft & Scraping:** Competitors clone your entire database to undercut your business model.
* 🎟️ **Scalping:** Bots buy up limited inventory instantly, ruining the experience for real customers.
* 💥 **Server Crashes (DDoS):** Massive volumes of automated traffic overwhelm the servers, taking the site offline.

---

## 💡 The Solution: A Layered Defense
Aiee acts as an intelligent "Bouncer" standing at the front door of your API. Instead of simply blocking static IP addresses (which bots easily spoof using proxies), Aiee uses a **dynamic, layered risk-scoring engine**.

### ⚖️ The "False Positive" Philosophy
In cybersecurity, instantly blocking a user just because their browser looks slightly suspicious is dangerous—it leads to accidentally blocking legitimate customers (a **False Positive**). 

Aiee solves this by assigning **suspicion penalties** instead of instant bans. 
* If a user looks slightly suspicious but behaves normally, they are allowed in (on thin ice). 
* If they look suspicious *and* start clicking at superhuman speeds, the penalties stack up mathematically until the threshold is crossed, and Aiee slams the door. 

This requires multiple pieces of evidence before dropping the hammer, ensuring real users are protected.

---

## ⚙️ How It Works (Core Architecture)

The project consists of a **Node.js/Express Backend** (The Brains) and a **React Frontend** (The Dashboard). 

When a request hits the protected API route (`/api/compensation/:uuid`), it must pass through two critical middleware layers:

### 1. 🔍 The Detectors (`detectorMiddleware`)
The backend analyzes the request through 7 distinct detection modules:
1. **User-Agent Analysis:** Scans for known headless browsers (e.g., Puppeteer, HeadlessChrome) and automated scripts (e.g., python-requests).
2. **JavaScript Beacons:** Verifies a special header (`x-aiee-js-beacon`) to prove the client can actually execute JavaScript (dumb bots cannot).
3. **Interaction Tracking:** Checks for proof of human UI interaction (mouse movements, clicks) via headers.
4. **Request Rate (Burst):** Tracks how many requests a single IP has made in the last 10 seconds.
5. **Sequential URLs:** Detects bots trying to scrape paths alphabetically or numerically (e.g., `/1`, `/2`, `/3`).
6. **Timing Variance:** Analyzes the milliseconds between requests. Perfect rhythm indicates a robotic script; humans are chaotic.
7. **Crawler Whitelist:** Safely bypasses the system for legitimate search engine indexers (like Googlebot).

### 2. 🧮 The Risk Engine & Mitigation (`mitigateMiddleware`)
The detectors output individual penalty points which are aggregated into a final **Risk Score (0 to 100)**:

* 🟢 **Allow (Score 0 - 29):** Legitimate human traffic. The request passes through transparently.
* 🟡 **Challenge (Score 30 - 69):** Suspicious traffic. The server intercepts the request and returns an `HTTP 403 Forbidden`, demanding further proof of humanity (e.g., a CAPTCHA or cryptographic token).
* 🔴 **Block (Score 70 - 100):** Guaranteed bot traffic. The server instantly drops the connection with an `HTTP 429 Too Many Requests`.

### 🧠 State Management
To track rapid bot attacks across multiple requests, Aiee uses a custom, lightweight **In-Memory Session Store**. It records the last 50 requests, timestamps, and URL paths for every visitor, allowing the detectors to spot patterns over time without needing an external database.

---

## 🚀 How to Run the Project

You will need two terminal windows open to run the full stack.

1. **Install Dependencies:**
   ```bash
   npm install
   ```

2. **Start the Backend Security Server (The Bouncer):**
   ```bash
   npm run server
   ```
   *(Runs on http://127.0.0.1:3000)*

3. **Start the React Dashboard (The UI):**
   *(Open a second terminal window)*
   ```bash
   npm run dashboard
   ```
   *(Runs on http://127.0.0.1:5173)*

---

## 🧪 How to Demo the Live System

Once both the server and dashboard are running, open your browser to `http://127.0.0.1:5173`. Scroll down to the **"Test Protected Endpoint"** panel to see the backend risk engine calculate scores in real-time.

1. 🧑‍💻 **Click "1x Human":** 
   Simulates a normal Chrome browser with valid JS execution. Aiee scores it at 0 and allows it instantly (`200 OK`).
2. 🕵️ **Click "1x Suspicious":** 
   Simulates a Python script making a single request. Aiee notices the bad User-Agent and adds 25 penalty points. Because 25 is under the limit, it allows the request. This perfectly demonstrates our protection against False Positives.
3. 🔥 **Click "Run Bot Simulator (12x)":** 
   Simulates an aggressive Bot Burst Attack. It fires 12 Python requests in half a second. Watch the live logs: Aiee detects the superhuman speed, stacks the rate-limit penalties on top of the User-Agent penalties, crosses the 70-point threshold, and instantly locks the bot out (`429 Blocked`).

---

## 🚧 Current Limitations (Prototype Scope)
* **Storage:** Uses in-memory data structures. Session data resets when the server restarts. A production version would require Redis for distributed state tracking across server clusters.
* **Analytics:** The dashboard charts currently display static mock data to demonstrate the intended UI layout. Only the "Test Protected Endpoint" panel is wired to the live backend.
* **Challenge Bypass:** The "Challenge" state currently uses a simple hardcoded header (`x-aiee-challenge-token`) for testing purposes, rather than serving a real cryptographic proof-of-work challenge.
