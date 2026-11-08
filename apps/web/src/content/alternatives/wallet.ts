import type { Alternative } from "./types";

const PLAY =
  "https://play.google.com/store/apps/details?id=com.droid4you.application.wallet&hl=en_IN&gl=IN";
const SMS_HELP =
  "https://support.budgetbakers.com/hc/en-us/articles/396317525793446-Notification-Access-Permission-India";
const SMS_SEARCH =
  "https://support.budgetbakers.com/hc/en-us/search?query=SMS+Pay+Sync";
const PRODUCT = "https://budgetbakers.com/en/products/wallet/";
const DATA_SAFETY =
  "https://play.google.com/store/apps/datasafety?id=com.droid4you.application.wallet&hl=en_IN&gl=IN";

export const wallet: Alternative = {
  slug: "wallet",
  name: "Wallet by BudgetBakers",
  nameNote:
    "Not the payment wallet apps from Google, Apple or Samsung. Wallet by BudgetBakers is a budgeting app.",
  seoTitle: "Raqm vs Wallet by BudgetBakers: Quick Comparison",
  seoDescription:
    "Raqm vs Wallet by BudgetBakers at a glance: sign-up, where data lives, SMS reading, budgets, widgets and voice logging in one sourced comparison card.",
  h1: "Raqm vs Wallet by BudgetBakers",
  lede: "Raqm is an Android expense tracker that reads bank SMS on your phone, with no account needed.",
  verifiedOn: "2026-11-08",
  rows: [
    { feature: "No sign-up needed", icon: "user", raqm: "yes", other: "Sign-in", source: PLAY },
    { feature: "Data stays on your phone", icon: "phone", raqm: "yes", other: "Cloud sync", source: PLAY },
    { feature: "Reads bank SMS", icon: "sms", raqm: "120+ banks", other: "yes", source: SMS_HELP },
    { feature: "No analytics library", icon: "wifi", raqm: "yes", other: "App interactions collected", source: DATA_SAFETY },
    { feature: "Transfers kept out of totals", icon: "transfer", raqm: "yes", other: "unknown" },
    { feature: "Refunds netted automatically", icon: "refund", raqm: "yes", other: "unknown" },
    { feature: "Safe-to-spend budgets", icon: "chart", raqm: "yes", other: "unknown" },
    { feature: "Home-screen widgets", icon: "widget", raqm: "7 widgets", other: "unknown" },
    { feature: "Voice logging", icon: "phone", raqm: "On-device", other: "unknown" },
    { feature: "Split with people", icon: "user", raqm: "yes", other: "unknown" },
  ],
  faq: [
    {
      q: "Does Wallet by BudgetBakers need an account?",
      a: "Its Google Play listing says to start by signing in via Facebook or Google. Raqm needs no account or sign-up.",
    },
    {
      q: "Does Wallet read bank SMS in India?",
      a: "BudgetBakers help lists SMS Pay Sync as available in India, off by default. Raqm reads bank SMS on the phone using 120+ bank formats.",
    },
    {
      q: "Is there an expense tracker with no cloud sync?",
      a: "Raqm keeps data and categorisation on your phone and has no cloud sync. Wallet's Play listing says its data is synced to the cloud.",
    },
  ],
  sources: [
    { label: "Wallet on Google Play", url: PLAY },
    { label: "Wallet data safety on Google Play", url: DATA_SAFETY },
    { label: "BudgetBakers Wallet product page", url: PRODUCT },
    { label: "BudgetBakers help: Notification access (India)", url: SMS_HELP },
    { label: "BudgetBakers help search: SMS Pay Sync", url: SMS_SEARCH },
  ],
};
