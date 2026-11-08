import type { Alternative } from "./types";

const PLAY =
  "https://play.google.com/store/apps/details?id=com.Splitwise.SplitwiseMobile&hl=en_IN";
const PRO = "https://www.splitwise.com/pro";
const PRIVACY = "https://www.splitwise.com/privacy";
const APPSTORE = "https://apps.apple.com/in/app/splitwise/id458023433";

export const splitwise: Alternative = {
  slug: "splitwise",
  name: "Splitwise",
  nameNote:
    "Splitwise is a group-expense app. Raqm is a personal tracker with a smaller split feature.",
  seoTitle: "Raqm vs Splitwise: tracking your own spending",
  seoDescription:
    "Raqm vs Splitwise for tracking your own spending: bank SMS reading, budgets, widgets and on-phone data side by side, with sources for every Splitwise cell.",
  h1: "Raqm vs Splitwise",
  lede: "For tracking your own spending, here is how Raqm and Splitwise compare, feature by feature.",
  verifiedOn: "2026-11-08",
  rows: [
    { feature: "Data stays on your phone", icon: "phone", raqm: "yes", other: "Cloud hosted", source: PRIVACY },
    { feature: "Reads bank SMS", icon: "sms", raqm: "yes", other: "unknown" },
    { feature: "Budgets", icon: "chart", raqm: "yes", other: "unknown" },
    { feature: "Charts and graphs", icon: "chart", raqm: "yes", other: "Pro plan", source: PRO },
    { feature: "Home-screen widgets", icon: "widget", raqm: "7 widgets", other: "unknown" },
    { feature: "Voice logging", icon: "phone", raqm: "yes", other: "unknown" },
    { feature: "Transfers kept out of totals", icon: "transfer", raqm: "yes", other: "unknown" },
    { feature: "Export", icon: "export", raqm: "yes", other: "yes", source: PLAY },
    { feature: "Split with people", icon: "user", raqm: "yes", other: "yes", source: PLAY },
  ],
  faq: [
    {
      q: "Can Raqm replace Splitwise?",
      a: "For tracking your own spending, yes. Raqm also splits with people, but it has no multi-currency or debt simplification, which Splitwise lists for groups.",
    },
    {
      q: "Does Raqm read bank SMS automatically?",
      a: "Yes. Raqm reads bank SMS on your phone using a parser for 120+ bank formats. Android only today. Processing and categorisation happen on the device.",
    },
    {
      q: "Do I need an account to use Raqm?",
      a: "No. Raqm has no account or sign-up, no analytics library, and no bank login. Only the optional Location map card contacts OpenStreetMap.",
    },
  ],
  sources: [
    { label: "Splitwise on Google Play (India)", url: PLAY },
    { label: "Splitwise on the India App Store", url: APPSTORE },
    { label: "Splitwise Pro page", url: PRO },
    { label: "Splitwise privacy policy", url: PRIVACY },
  ],
};
