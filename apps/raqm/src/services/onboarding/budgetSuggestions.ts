// Suggests a starting budget per category from real historical spend
// (Android, post-scan) — the "immediate payoff" pattern from the onboarding
// research (Copilot/Simplifi). Pure function: no DB access, no side effects.
// Persisting the user's final choice goes through the existing budgets
// persistence in src/db/database.ts (upsertBudget), not this file.
export function suggestBudgetsFromSpend(
  categorySpend: Record<string, number>,
): Record<string, number> {
  const suggestions: Record<string, number> = {};
  for (const [category, spend] of Object.entries(categorySpend)) {
    // Round to nearest 100 so the suggested figure reads as a deliberate
    // number, not a copy-pasted raw total.
    suggestions[category] = Math.round(spend / 100) * 100;
  }
  return suggestions;
}
