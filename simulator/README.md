# Simulator Layer

The simulators create traffic so the prototype can demonstrate bot detection.

## Bot Simulator

The bot simulator should eventually:

- Send high request volume.
- Use scripted/headless User-Agent values.
- Hit compensation records repeatedly or sequentially.
- Skip JavaScript beacon and interaction signals.
- Produce a high risk score.

## Human Simulator

The human simulator should eventually:

- Send slower requests.
- Use browser-like User-Agent values.
- Browse records in a less predictable order.
- Include JS beacon and interaction-like signals.
- Produce a low risk score.
