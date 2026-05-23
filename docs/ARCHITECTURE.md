# Aiee Architecture

## Purpose

Aiee protects valuable API data from scraping by scoring request behavior instead of blindly blocking users by IP.

The mock target is compensation data similar to a Levels.fyi record. The protected data is not used to train a model. It is the payload that bots try to scrape.

## Main Components

### Server

The Express server owns protected routes, detector middleware, scoring, mitigation, and analytics collection.

### Detectors

Each detector returns a signal, a score contribution, and a short reason.

Planned detectors:

- Request rate detector.
- URL pattern detector.
- User-Agent detector.
- JavaScript beacon detector.
- Interaction detector.
- Timing variance detector.
- Search crawler whitelist detector.

### Risk Scoring

The scoring service combines detector outputs into one risk score.

Planned score tiers:

- `0-29`: allow.
- `30-69`: challenge.
- `70+`: block or throttle.

### Dashboard

The React dashboard will show live prototype analytics:

- Total requests vs blocked requests.
- Bot score distribution.
- Top offending IPs.
- Signal breakdown.
- Whitelist activity.
- False-positive estimate.

### Simulators

The bot simulator creates fast, repetitive, scraper-like traffic.

The human simulator creates slower, random, browser-like traffic.

## Data

Mock compensation records live in `server/data/compensationRecords.json`.

They represent the data being protected, not detection training data.
