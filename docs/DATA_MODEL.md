# Data Model

## Compensation Record

The compensation record is mock protected data.

It is the thing Aiee protects from scraping. It is not training data for the detector.

Important fields:

- `uuid`: stable record identifier.
- `company`: company name.
- `title`: job title.
- `level`: job level.
- `location`: work location.
- `totalCompensation`: annual compensation value.
- `baseSalary`: base salary value.
- `avgAnnualStockGrantValue`: annual stock value.
- `avgAnnualBonusValue`: annual bonus value.
- `companyInfo`: company metadata and logo URL.

## Risk Event

The dashboard will eventually consume a normalized event shaped roughly like this:

```json
{
  "timestamp": "2026-05-23T00:00:00.000Z",
  "ip": "127.0.0.1",
  "path": "/api/compensation/8199449f-7a0d-4f83-9427-bdaeae2d507a",
  "score": 85,
  "decision": "block",
  "signals": [
    {
      "key": "highRequestRate",
      "triggered": true,
      "score": 35,
      "reason": "More than 10 requests in one minute"
    }
  ]
}
```
