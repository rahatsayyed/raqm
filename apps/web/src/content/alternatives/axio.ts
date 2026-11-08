import type { Alternative } from "./types";

const PLAY =
  "https://play.google.com/store/apps/details?id=com.daamitt.walnut.app&hl=en_IN&gl=IN";
const SAFETY =
  "https://play.google.com/store/apps/datasafety?id=com.daamitt.walnut.app&hl=en_IN";

export const axio: Alternative = {
  slug: "axio",
  name: "Axio",
  nameNote: "formerly Walnut",
  seoTitle: "Raqm vs Axio (formerly Walnut) compared",
  seoDescription:
    "Raqm vs Axio (formerly Walnut): a side-by-side of two SMS expense trackers on accounts, data, widgets, voice logging, split and budgets, from public listings.",
  h1: "Raqm vs Axio",
  lede: "Raqm is a private, on-device expense tracker for Android that reads bank SMS with no account, shown next to Axio.",
  verifiedOn: "2026-11-08",
  rows: [
    { feature: "Reads bank SMS", icon: "sms", raqm: "yes", other: "yes", source: PLAY },
    { feature: "No account needed", icon: "user", raqm: "yes", other: "unknown", source: SAFETY },
    { feature: "SMS processed on the phone", icon: "phone", raqm: "yes", other: "unknown", source: PLAY },
    { feature: "No data collected", icon: "wifi", raqm: "yes", other: "no", source: SAFETY },
    { feature: "Open-source SMS parser", icon: "bank", raqm: "yes", other: "unknown", source: PLAY },
    { feature: "Home-screen widgets", icon: "widget", raqm: "7 widgets", other: "unknown", source: PLAY },
    { feature: "Voice logging", icon: "user", raqm: "yes", other: "unknown", source: PLAY },
    { feature: "Transfers kept out of totals", icon: "transfer", raqm: "yes", other: "unknown", source: PLAY },
    { feature: "Safe-to-spend", icon: "chart", raqm: "yes", other: "unknown", source: PLAY },
    { feature: "Split with people", icon: "refund", raqm: "yes", other: "unknown", source: PLAY },
  ],
  faq: [
    {
      q: "Is there an Axio alternative without sign-up?",
      a: "Raqm needs no account or sign-up. It reads bank SMS and processes it on your Android phone. The waitlist is open.",
    },
    {
      q: "Is Walnut the same as Axio?",
      a: "Per Axio's Play listing, axio was formerly known as Capital Float, Walnut and Walnut 369.",
    },
    {
      q: "Can Raqm import my Axio data?",
      a: "Yes. Raqm imports an Axio CSV file, and also Google Pay PDF files. Bank statement PDF import is coming.",
    },
  ],
  sources: [
    { label: "axio on Google Play", url: PLAY },
    { label: "axio Play data safety section", url: SAFETY },
    { label: "axio website", url: "https://axio.co.in/" },
    { label: "axio privacy policy", url: "https://axio.co.in/privacy-policy/" },
  ],
};
