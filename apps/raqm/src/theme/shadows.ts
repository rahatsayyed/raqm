// DESIGN.md §6: exactly one shadow value exists in this system — no screen
// may define its own shadow color/opacity/radius. Single source of truth so
// that constraint isn't copy-pasted prose across screens.
export const Shadows = {
  card: {
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.28,
    shadowRadius: 24,
    elevation: 8,
  },
} as const;
