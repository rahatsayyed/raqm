# Changelog

All notable changes to this project will be documented here.
Format: [Semantic Versioning](https://semver.org/) — `MAJOR.MINOR.PATCH`

---

## Unreleased

## v0.0.1 — Internal
### Added
- SMS scan — read all historical bank SMS using `@rahatsayyed/bank-sms-parser`
- Transaction list — chronological list with date headers, amount, merchant, bank name
- Basic transaction detail screen
- Onboarding: permissions flow (SMS Read, SMS Receive, Notifications)
- Onboarding: date range picker with earliest SMS detection
- Onboarding: account selection after scan

---

## Release Roadmap

| Version | Track | What ships |
|---|---|---|
| `v0.0.1` | Internal | SMS scan → transaction list (this build) |
| `v0.0.2` | Internal | Bug fixes from v0.0.1 testing |
| `v0.1.0` | Internal | Categories + sub-categories + basic dashboard |
| `v0.2.0` | Alpha | Accounts & cards |
| `v0.3.0` | Alpha | Budgets |
| `v0.4.0` | Alpha | Analytics + comparison views (today vs yesterday etc.) |
| `v0.5.0` | Alpha | Subscriptions + notifications + notification replacement |
| `v0.6.0` | Beta | Grocery list |
| `v0.7.0` | Beta | Supabase sync + auth |
| `v0.8.0` | Beta | UI polish — blur, gradients, color themes, dark mode |
| `v0.9.0` | Beta | Full feature set — public beta testing |
| `v1.0.0` | Production | Public launch |

---

## Versioning Rules

| Change type | Bump |
|---|---|
| Bug fix, UI polish, copy change | `0.0.x` |
| New screen or feature added | `0.x.0` |
| Major UX overhaul / architecture change | `x.0.0` |
| Full V1 feature complete | `1.0.0` |

## Android versionCode Convention
`MAJOR × 10000 + MINOR × 100 + PATCH`
e.g. `v0.1.0` → versionCode `100`, `v1.0.0` → versionCode `10000`
