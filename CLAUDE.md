# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository

npm-workspaces monorepo for **Raqm**, a private, on-device personal finance tracker (Android-only, Expo). Two workspaces:

- `apps/raqm` — the Expo app (SDK 56, React Native 0.85, New Architecture, TypeScript). This is where nearly all work happens.
- `packages/bank-sms-parser` (`@rahatsayyed/bank-sms-parser`) — standalone TS parser for 120+ bank SMS formats. Has its own jest suite.

`docs/superpowers/specs/2026-07-02-raqm-v0-design.md` is the v0 spec (includes the manual verification checklist); `docs/superpowers/plans/` holds the implementation plans and the cross-plan interface contract (`...-shared-interfaces.md`). `FEATURE.md` is the feature roadmap — note its "WatermelonDB/Supabase" pipeline sketch is aspirational; the real implementation is expo-sqlite with no sync.

## Commands

```bash
npm run raqm            # Metro dev server (from repo root)
npm run raqm:android    # build + install on device/emulator (required after native/Kotlin/app.json plugin changes; JS-only changes just need Metro reload)
cd apps/raqm && npx tsc --noEmit      # typecheck — MUST run from apps/raqm, the root tsconfig errors with TS6305
cd packages/bank-sms-parser && npm test              # parser jest suite
cd packages/bank-sms-parser && npx jest path/to/test # single parser test
```

The app itself has **no test runner**. The working convention: `tsc --noEmit` after every change + manual device verification against the spec's checklist. Pure logic can be sanity-checked with throwaway scripts run via `npx tsx` (tsx is a devDependency).

Expo API surface changed significantly in SDK 56 — check https://docs.expo.dev/versions/v56.0.0/ before writing Expo-API code (e.g. expo-file-system is the class-based `File`/`Paths` API; `expo-notifications` `channelId` lives on triggers, not content; RN 0.85 dropped `StyleSheet.absoluteFillObject`).

## Architecture (apps/raqm)

**Data flow:** Android SMS → local Expo module `modules/sms-reader` (Kotlin: inbox read, BroadcastReceiver for live SMS, NotificationListenerService that cancels raw bank-SMS notifications) → `BankParserFactory.parse()` → categorization → SQLite (`src/db/database.ts`) → zustand store → screens.

- `src/db/database.ts` — the single ~1500-line data layer: versioned migration runner (`schema_migrations`, currently v3), all CRUD, categorization. Everything is expo-sqlite **async API with explicit `runAsync('BEGIN')`/`COMMIT`/`ROLLBACK`** — never `withTransactionAsync` (nested-transaction crash). All SQL parameterized.
- `src/store/txStore.ts` — main-app source of truth (`TxRecord[]`, excludes soft-deleted). `src/store/onboardingStore.ts` only serves the onboarding scan flow.
- `src/services/` — `txIntelligence(.Core)` (self-transfer/refund/subscription detection; Core is pure/Node-runnable), `budgets`, `rescan`, `export`, `location`.
- `src/navigation/` — stack wrapping a 5-tab navigator; `MainStackParamList` in `types.ts`; `navigationRef.ts` for notification deep links.
- Onboarding lives in `src/screens/onboarding/`; permission screens auto-skip when already granted.

**Invariants that exist because violating them caused real bugs:**

- `getDb()` caches the open+migrate **promise**, not the handle — concurrent startup callers opening duplicate connections caused native `prepareAsync` NPEs.
- `insertParsedTxs` categorizes rows **sequentially** — a `Promise.all` over ~5k categorize calls crashed SQLite and defeated the merchant-rule cache.
- Detection jobs (`runDetectionJobs`) write to the DB directly, so they must run **before** `useTxStore.refresh()`.
- Detection pairers in `txIntelligenceCore` are amount-bucketed; keep them ~O(n) — the naive O(n²) scan froze at 5k transactions.
- Spend math everywhere (Dashboard, Analytics, CategoryDetail, budgets, export) = `countsTowardTotals()` + refund credits netted against the refunded expense's category **via `linkPartnerId`** (refund credits usually carry no categoryId). Keep new aggregations consistent. Known accepted divergence: Dashboard counts TRANSFER/INVESTMENT as expenses; Analytics/budgets count EXPENSE only.
- Deletion is always a **soft delete** (`deleted_at`), restorable from More → Deleted transactions. Scans are missing-only: a scanned transaction's identity is `bankName|amount|smsTimestamp`, checked against ALL rows **including soft-deleted** — user deletions and edits must survive every scan. Multi-row ops (`mergeTxs`/`splitTx`) reject already-deleted sources; async button handlers need in-flight guards (double-tap double-submits have shipped twice).
- Scan operations are serialized through one in-flight promise in `src/services/rescan.ts`.
- Tab screens navigating to stack routes use the `getParent<NavigationProp<MainStackParamList>>()` pattern (see AnalyticsScreen). Route params must be serializable — CategoryPicker returns its selection via `popTo(returnTo, { picked... }, { merge: true })`, not callbacks.
- Screens that read settings (e.g. `month_start_day`) must re-read on `useFocusEffect` — they stay mounted beneath pushed screens like Settings.
- **List performance**: transaction lists render thousands of rows (real devices hold ~5k+ txs) and RN's VirtualizedList "large list that is slow to update" warning has been hit in the field. Row components for `FlatList`s must be wrapped in `React.memo` with primitive/stable props; `renderItem` and `keyExtractor` must be stable references (`useCallback`/module-level, not fresh inline closures per render); derive per-row data in the row component, not in the parent's render pass. Prefer `FlatList` over `.map()` inside a ScrollView for anything unbounded.

**Theme:** dark-only. All colors/typography/spacing from `src/theme` tokens (`Colors.*`, incl. custom `bgSurfaceRaised`, `borderSubtle`, `inkHeadline`, `errorMuted`, `mossStructure`) — never hardcode hex/`rgba(255,...)`. Amounts through `src/utils/format.ts` `formatAmount` (2-decimal, maps currency codes like `INR` → `₹`). Period math through `src/utils/period.ts` (`getMonthBounds` honors the custom month-start-day setting, clamped 1–28).

**Native/CNG:** `apps/raqm/android/` is gitignored and regenerated by prebuild — native changes only survive inside `apps/raqm/modules/sms-reader/`. The NotificationListenerService must never throw (Android revokes notification access on crash). Verify Kotlin with `cd apps/raqm/android && ./gradlew :app:compileDebugKotlin` after a prebuild.

## Git

Never commit or push without explicit user confirmation. Commit messages are conventional (`feat(raqm): …`, `fix(raqm): …`).

<!-- code-review-graph MCP tools -->
## MCP Tools: code-review-graph

**IMPORTANT: This project has a knowledge graph. ALWAYS use the
code-review-graph MCP tools BEFORE using Grep/Glob/Read to explore
the codebase.** The graph is faster, cheaper (fewer tokens), and gives
you structural context (callers, dependents, test coverage) that file
scanning cannot.

### When to use graph tools FIRST

- **Exploring code**: `semantic_search_nodes` or `query_graph` instead of Grep
- **Understanding impact**: `get_impact_radius` instead of manually tracing imports
- **Code review**: `detect_changes` + `get_review_context` instead of reading entire files
- **Finding relationships**: `query_graph` with callers_of/callees_of/imports_of/tests_for
- **Architecture questions**: `get_architecture_overview` + `list_communities`

Fall back to Grep/Glob/Read **only** when the graph doesn't cover what you need.

### Key Tools

| Tool | Use when |
|------|----------|
| `detect_changes` | Reviewing code changes — gives risk-scored analysis |
| `get_review_context` | Need source snippets for review — token-efficient |
| `get_impact_radius` | Understanding blast radius of a change |
| `get_affected_flows` | Finding which execution paths are impacted |
| `query_graph` | Tracing callers, callees, imports, tests, dependencies |
| `semantic_search_nodes` | Finding functions/classes by name or keyword |
| `get_architecture_overview` | Understanding high-level codebase structure |
| `refactor_tool` | Planning renames, finding dead code |

### Workflow

1. The graph auto-updates on file changes (via hooks).
2. Use `detect_changes` for code review.
3. Use `get_affected_flows` to understand impact.
4. Use `query_graph` pattern="tests_for" to check coverage.
