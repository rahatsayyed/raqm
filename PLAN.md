# Raqm — Build Plan

## App Name
Raqm.

## Color Theme
Spring Green (`#52B788`) as default — soft palette, dark + light both, blur/glass effects.
User-selectable color themes in Settings (Green, Blue, Purple, Amber, Rose, Monochrome).
Gradient only in hero section. Icon theming is Phase 2.

---

## Tech Stack

| Layer | Tool |
|---|---|
| Framework | Expo + Expo Modules API + Config Plugins + EAS Build |
| Language | TypeScript + Kotlin (one custom native module) |
| Native module | Custom Kotlin — SMS READ + NotificationListenerService (one module, no third-party lib) |
| Navigation | React Navigation v7 |
| Local DB | WatermelonDB (hold schema until parser verified on real device) |
| SMS Parser | `packages/bank-sms-parser` — workspace package inside monorepo |
| State | Zustand |
| Backend/Auth | Supabase (client set up in v0, sync skipped until v0.7) |
| Animations | React Native Reanimated v3 |
| UI | Custom components only |
| Blur | `@react-native-community/blur` |

---

## Parser Strategy

- `bank-sms-parser` lives as a local workspace package (`packages/bank-sms-parser`) during development
- App imports via workspace reference — zero npm publish overhead
- Published npm version (`@rahatsayyed/bank-sms-parser`) diverges until the library is mature
- Before npm publish: refactor to data-driven bank configs (JSON/object per bank, not class-per-bank) for easy community contributions
- 123 parsers, 328 tests, TypeScript port of PennyWise parser-core

---

## v0.0.1 Build Order

```
1. Expo project setup + monorepo workspace config
2. Move parser into monorepo as workspace package
3. Custom Kotlin native module — SMS permission + READ_SMS query
4. Wire parser to native module output — verify on real device
5. Fix any parser gaps found from real SMS
6. WatermelonDB schema (only after step 4 is solid)
7. Onboarding UI + transaction list + transaction detail
```

No charts, no analytics, no budgets in v0.

---

## Release Roadmap

| Version | Track | What ships |
|---|---|---|
| `v0.0.1` | Internal | SMS scan → transaction list |
| `v0.0.2` | Internal | Bug fixes |
| `v0.1.0` | Internal | Categories + sub-categories + dashboard |
| `v0.2.0` | Alpha | Accounts & cards |
| `v0.3.0` | Alpha | Budgets |
| `v0.4.0` | Alpha | Analytics + comparison views |
| `v0.5.0` | Alpha | Subscriptions + notifications + notification replacement |
| `v0.6.0` | Beta | Grocery list |
| `v0.7.0` | Beta | Supabase sync + auth |
| `v0.8.0` | Beta | UI polish — blur, gradients, color themes, dark mode |
| `v0.9.0` | Beta | Full feature set — public beta |
| `v1.0.0` | Production | Public launch |

## Versioning Rules
| Change | Bump |
|---|---|
| Bug fix, UI polish | `0.0.x` |
| New screen or feature | `0.x.0` |
| Major UX/architecture overhaul | `x.0.0` |
| Full V1 complete | `1.0.0` |

Android versionCode: `MAJOR × 10000 + MINOR × 100 + PATCH`

---

## Key Decisions Locked

- **No backend** — all processing on-device; Supabase is sync/storage only
- **Android only** — iOS has no SMS access; iOS users get PDF/Gmail in V2
- **No third-party SMS lib** — custom Kotlin module handles both SMS read + NotificationListenerService
- **Bare workflow rejected** — Expo config plugins handle all custom native code; keeps OTA + upgrade conveniences
- **WatermelonDB** — offline-first local SQLite; schema finalised after real-device parser verification
- **No charts in v0** — added in v0.4.0 (Analytics release)
- **Notification replacement** — requires `BIND_NOTIFICATION_LISTENER_SERVICE` (separate from `POST_NOTIFICATIONS`); optional permission, prompted in onboarding
- **Sub-categories** — optional layer on top of categories; category alone always sufficient
- **Salary ≠ Income** — categorisation layer handles distinction (keyword + recurrence detection); parser just marks all credits as `INCOME`
- **Self-transfer window** — 24 hours (not 4 hours)
- **Ghost price in grocery list** — stored per item name from last list entry; no SMS dependency

---

## Reference Docs

| File | Contents |
|---|---|
| `FEATURE.md` | Full feature specification |
| `SCREENS.md` | All 72 screens with `[v0]` markers |
| `CHANGELOG.md` | Release roadmap + versioning rules |
| `packages/bank-sms-parser/` | SMS parser — 123 banks, 328 tests |
| `packages/bank-sms-parser/SYNC.md` | How to replicate upstream PennyWise changes |
