import type { Alternative } from "./types";

const PLAY =
  "https://play.google.com/store/apps/details?id=com.pennywiseai.tracker&hl=en_IN&gl=IN";
const SAFETY =
  "https://play.google.com/store/apps/datasafety?id=com.pennywiseai.tracker&hl=en_IN";
const GH = "https://github.com/sarim2000/pennywiseai-tracker";
const PRIV =
  "https://raw.githubusercontent.com/sarim2000/pennywiseai-tracker/main/PRIVACY.md";
const README =
  "https://raw.githubusercontent.com/sarim2000/pennywiseai-tracker/main/README.md";

export const pennywise: Alternative = {
  slug: "pennywise",
  name: "PennyWise: SMS Expense Tracker",
  seoTitle: "Raqm vs PennyWise (SMS Expense Tracker) compared",
  seoDescription:
    "Raqm vs PennyWise: SMS Expense Tracker. Both read bank SMS on the phone with no account. See the side-by-side on widgets, voice, split and more.",
  h1: "Raqm vs PennyWise",
  lede: "Both read bank SMS on the phone with no account; Raqm adds widgets, voice logging and split with people.",
  verifiedOn: "2026-11-08",
  rows: [
    { feature: "Reads bank SMS", icon: "sms", raqm: "yes", other: "yes", source: PLAY },
    { feature: "No account needed", icon: "user", raqm: "yes", other: "yes", source: PLAY },
    { feature: "SMS processed on the phone", icon: "phone", raqm: "yes", other: "yes", source: PLAY },
    { feature: "Safe-to-spend", icon: "chart", raqm: "yes", other: "yes", source: PLAY },
    { feature: "Home-screen widgets", icon: "widget", raqm: "7 widgets", other: "unknown", source: PLAY },
    { feature: "Voice logging", icon: "user", raqm: "yes", other: "unknown", source: PLAY },
    { feature: "Split with people", icon: "refund", raqm: "yes", other: "unknown", source: PLAY },
    { feature: "Transfers kept out of totals", icon: "transfer", raqm: "yes", other: "unknown", source: PLAY },
    { feature: "Axio CSV import", icon: "bank", raqm: "yes", other: "unknown", source: PLAY },
    { feature: "Export", icon: "export", raqm: "yes", other: "Pro plan", source: PLAY },
  ],
  faq: [
    {
      q: "Is there a PennyWise alternative with split expenses?",
      a: "Raqm has split with people: equal, percentage, share or exact. It flags a matching repayment. The waitlist is open.",
    },
    {
      q: "Does Raqm need an account like other SMS trackers?",
      a: "No. Raqm needs no account or sign-up, and reads and categorises bank SMS on your Android phone.",
    },
    {
      q: "Which PennyWise app is this page about?",
      a: "PennyWise: SMS Expense Tracker on Google Play (package com.pennywiseai.tracker). Other apps share the PennyWise name and were not compared.",
    },
  ],
  sources: [
    { label: "PennyWise on Google Play", url: PLAY },
    { label: "PennyWise Play data safety section", url: SAFETY },
    { label: "PennyWise GitHub repository", url: GH },
    { label: "PennyWise README", url: README },
    { label: "PennyWise privacy policy", url: PRIV },
  ],
};
