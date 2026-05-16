/**
 * Shared server-side password policy.
 * Returns an error message string if the password is invalid, or null if it passes.
 */
export function validatePasswordStrength(password: string): string | null {
  if (password.length < 12) return "Password must be at least 12 characters";
  if (!/[A-Z]/.test(password)) return "Password must include at least one uppercase letter (A–Z)";
  if (!/[a-z]/.test(password)) return "Password must include at least one lowercase letter (a–z)";
  if (!/[0-9]/.test(password)) return "Password must include at least one number (0–9)";
  return null;
}
