import type { Alternative } from "./types";

const PLAY =
  "https://play.google.com/store/apps/details?id=com.whizdm.moneyview.loans&hl=en_IN&gl=IN";
const DATA_SAFETY =
  "https://play.google.com/store/apps/datasafety?id=com.whizdm.moneyview.loans&hl=en_IN&gl=IN";
const PRIVACY = "https://moneyview.in/privacy-policy-loans";
const BLOG = "https://moneyview.in/loan-insights/best-money-management-apps-in-india";
const HOME = "https://moneyview.in/";

export const moneyView: Alternative = {
  slug: "money-view",
  name: "Moneyview",
  nameNote:
    "Moneyview's Play listing is titled Moneyview: UPI, Personal Loans. It is mainly a credit and loans app, so this is a different category from Raqm.",
  seoTitle: "Raqm vs Moneyview: Quick Comparison",
  seoDescription:
    "Raqm vs Moneyview at a glance: SMS handling, sign-up, analytics and budgets in one sourced card. Moneyview is a loan app; Raqm is an on-device expense tracker.",
  h1: "Raqm vs Moneyview",
  lede: "Moneyview is a loan app per its Play listing; Raqm is an Android expense tracker that keeps bank SMS on your phone.",
  verifiedOn: "2026-11-08",
  rows: [
    { feature: "Built as an expense tracker", icon: "chart", raqm: "yes", other: "Loan app", source: PLAY },
    { feature: "No sign-up needed", icon: "user", raqm: "yes", other: "unknown" },
    { feature: "No analytics library", icon: "wifi", raqm: "yes", other: "App interactions collected", source: DATA_SAFETY },
    { feature: "Transfers kept out of totals", icon: "transfer", raqm: "yes", other: "unknown" },
    { feature: "Safe-to-spend budgets", icon: "chart", raqm: "yes", other: "unknown" },
    { feature: "Home-screen widgets", icon: "widget", raqm: "7 widgets", other: "unknown" },
    { feature: "Split with people", icon: "user", raqm: "yes", other: "unknown" },
  ],
  faq: [
    {
      q: "Is Moneyview an expense tracker?",
      a: "Its Google Play description calls it a loan app. Moneyview's blog mentions a Money Manager. Raqm is built only as an expense tracker.",
    },
    {
      q: "Does Moneyview read SMS?",
      a: "Its privacy policy says that with your permission it collects and stores transactional SMS data on its server. Raqm processes bank SMS on the phone.",
    },
    {
      q: "Which expense tracker keeps SMS on the phone?",
      a: "Raqm reads and categorises bank SMS on your phone, with no account and no analytics library.",
    },
  ],
  sources: [
    { label: "Moneyview on Google Play", url: PLAY },
    { label: "Moneyview data safety on Google Play", url: DATA_SAFETY },
    { label: "Moneyview privacy policy", url: PRIVACY },
    { label: "Moneyview blog: money management apps", url: BLOG },
    { label: "Moneyview website", url: HOME },
  ],
};
