# API Plan

## Public/System Routes

### `GET /health`

Returns server health.

## Protected Mock Data Routes

### `GET /api/compensation/:uuid`

Returns one mock compensation record if the request is allowed.

Possible outcomes:

- `200`: request allowed.
- `403`: challenge required or failed.
- `429`: request blocked or throttled.
- `404`: record not found.

## Analytics Routes

### `GET /api/analytics/live`

Returns live metrics for the dashboard.

## Admin Routes

### `POST /api/whitelist/:ip`

Manually mark an IP as allowed.

### `DELETE /api/block/:ip`

Remove an IP from the active block list.
