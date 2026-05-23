# Server Layer

The server is the heart of Aiee.

It receives API requests, evaluates whether the request looks human or bot-like, then decides what to do.

## Request Path

```text
Incoming request
  -> analytics middleware
  -> detector middleware
  -> mitigation middleware
  -> protected route
```

## Folders

- `config/`: scoring weights, thresholds, Redis config, crawler allowlist.
- `detectors/`: one file per behavior signal.
- `middleware/`: Express middleware that plugs detection into the request lifecycle.
- `routes/`: API route registration.
- `services/`: business logic for scoring, sessions, analytics, and challenges.
- `utils/`: small reusable helpers.
- `data/`: mock protected compensation records.
