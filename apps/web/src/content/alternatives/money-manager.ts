import type { Alternative } from "./types";

const PLAY =
  "https://play.google.com/store/apps/details?id=com.realbyteapps.moneymanagerfree&hl=en_IN&gl=IN";
const SAFETY =
  "https://play.google.com/store/apps/datasafety?id=com.realbyteapps.moneymanagerfree&hl=en_IN&gl=IN";
const POLICY = "https://www.realbyteapps.com/policy/privacy.html";
const SITE = "https://www.realbyteapps.com/";

export const moneyManager: Alternative = {
  slug: "money-manager",
  name: "Money Manager",
  nameNote:
    "Money Manager Expense & Budget, by Realbyte Inc. Not related to Raqm.",
  seoTitle: "Raqm vs Money Manager: SMS expense tracker compared",
  seoDescription:
    "Raqm vs Money Manager (Realbyte) compared side by side: bank SMS, on-phone data, accounts, analytics, budgets, widgets and export, with sources for each cell.",
  h1: "Raqm vs Money Manager",
  lede: "Both apps read bank SMS and offer budgets; here is how they differ on privacy, accounts, widgets and splits.",
  verifiedOn: "2026-11-08",
  rows: [
    { feature: "Reads bank SMS", icon: "sms", raqm: "yes", other: "yes", source: POLICY },
    { feature: "Data stays on your phone", icon: "phone", raqm: "yes", other: "Cloud if signed up", source: POLICY },
    { feature: "No analytics library", icon: "user", raqm: "yes", other: "Firebase Analytics", source: POLICY },
    { feature: "No account needed", icon: "user", raqm: "yes", other: "unknown" },
    { feature: "No bank login or linking", icon: "bank", raqm: "yes", other: "unknown" },
    { feature: "Budgets", icon: "chart", raqm: "yes", other: "yes", source: PLAY },
    { feature: "Export", icon: "export", raqm: "yes", other: "Excel", source: PLAY },
    { feature: "Home-screen widgets", icon: "widget", raqm: "7 widgets", other: "unknown" },
    { feature: "Split with people", icon: "transfer", raqm: "yes", other: "unknown" },
    { feature: "Transfers kept out of totals", icon: "transfer", raqm: "yes", other: "unknown" },
  ],
  faq: [
    {
      q: "Does Money Manager read bank SMS?",
      a: "Yes. Realbyte's privacy policy says received SMS is used for automatic entry of household account details. Raqm also reads bank SMS, on your phone.",
    },
    {
      q: "Is Raqm a good Money Manager alternative?",
      a: "Raqm covers SMS reading, budgets and export with no account and on-phone processing. It is Android only today and imports Axio CSV and Google Pay PDF.",
    },
    {
      q: "Does Raqm need an account or bank login?",
      a: "No. Raqm needs no sign-up and no bank login. Data is processed and categorised on your phone, with no analytics library.",
    },
  ],
  sources: [
    { label: "Money Manager on Google Play (India)", url: PLAY },
    { label: "Money Manager data safety on Google Play", url: SAFETY },
    { label: "Realbyte privacy policy", url: POLICY },
    { label: "Realbyte website", url: SITE },
  ],
};
