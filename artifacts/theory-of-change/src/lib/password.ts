export interface PasswordCheck {
  label: string;
  pass: boolean;
}

export function getPasswordChecks(password: string): PasswordCheck[] {
  return [
    { label: "At least 12 characters", pass: password.length >= 12 },
    { label: "Uppercase letter (A–Z)", pass: /[A-Z]/.test(password) },
    { label: "Lowercase letter (a–z)", pass: /[a-z]/.test(password) },
    { label: "Number (0–9)", pass: /[0-9]/.test(password) },
  ];
}

export function isPasswordValid(password: string): boolean {
  return getPasswordChecks(password).every(c => c.pass);
}

export function getPasswordError(password: string): string | null {
  if (password.length < 12) return "Password must be at least 12 characters";
  if (!/[A-Z]/.test(password)) return "Password must include an uppercase letter";
  if (!/[a-z]/.test(password)) return "Password must include a lowercase letter";
  if (!/[0-9]/.test(password)) return "Password must include a number";
  return null;
}
