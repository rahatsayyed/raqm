export function isValidEmail(email: string): boolean {
  const trimmed = email.trim();
  if (trimmed.length === 0) {
    return false;
  }
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed);
}
