---
name: awesome-design-md
description: Apply a specific brand's design language (Stripe, Apple, Linear, Airbnb, and 70+ others) to UI work. Use when asked to "use the <brand> design language", "make this look like <brand>", "apply <brand> style guide", or to browse available brand design guides.
metadata:
  author: voltagent
  source: https://github.com/voltagent/awesome-design-md
  argument-hint: <brand-name>
---

# Awesome Design MD

Fetch and apply a named brand's design guide (colors, type, spacing, motion,
voice) to the current UI work.

## Available brands

airbnb, airtable, apple, binance, bmw, bmw-m, bugatti, cal, claude, clay,
clickhouse, cohere, coinbase, composio, cursor, dell-1996, elevenlabs, expo,
ferrari, figma, framer, hashicorp, hp, ibm, intercom, kraken, lamborghini,
linear.app, lovable, mastercard, meta, minimax, mintlify, miro, mistral.ai,
mongodb, nike, nintendo-2001, notion, nvidia, ollama, opencode.ai, pinterest,
playstation, posthog, raycast, renault, replicate, resend, revolut, runwayml,
sanity, sentry, shopify, slack, spacex, spotify, starbucks, stripe, supabase,
superhuman, tesla, theverge, together.ai, uber, vercel, vodafone, voltagent,
warp, webflow, wired, wise, x.ai, zapier

(This list can go stale. To refresh it, list the folders under
`https://github.com/voltagent/awesome-design-md/tree/main/design-md`.)

## How It Works

1. If the user did not name a brand, show the list above and ask which one.
2. Fetch the brand's guide with WebFetch (or `curl`) from:
   `https://raw.githubusercontent.com/voltagent/awesome-design-md/main/design-md/<brand>/DESIGN.md`
3. Read the fetched guide. It has the brand's colors, type scale, spacing,
   motion, and voice rules.
4. Apply those rules to the requested UI code or design work — do not just
   summarize the guide back to the user, use it to guide real edits.
5. If the named brand is not in the list, say so and offer the closest match.

## Notes

- Fetch fresh each time — do not cache the guide content in memory between
  sessions, brand guides may be updated upstream.
- This project (Raqm) already has its own dark-only theme in `src/theme` and
  `apps/raqm/DESIGN.md` — do not apply a fetched brand guide over that
  without explicit user confirmation, since it would conflict with existing
  tokens.
