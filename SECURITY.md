# Security Policy

## Supported Scope

This project is maintained on the latest `main` branch deployment.

In scope:
- Firebase Hosting frontend (`src/`)
- Cloud Functions API (`functions/src/`)
- Firestore security rules (`firestore.rules`)

Out of scope:
- Local environment misconfiguration
- Issues caused by leaked local credentials

## Reporting a Vulnerability

If you discover a security issue, report it privately and include:
- Affected endpoint, page, or rule
- Reproduction steps
- Expected impact
- Suggested mitigation (if known)

Do not open public issues with exploit details.

## Secrets and Keys

- Never commit API keys or secrets.
- Store sensitive values in environment variables or secure backend storage.
- Use least-privilege API keys (read-only when possible).

## Response Targets

- Initial triage target: within 72 hours
- Fix timeline: based on severity and exploitability
