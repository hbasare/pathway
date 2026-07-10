import { describe, it, expect } from "vitest";
import { validatePasswordStrength } from "./password";

describe("Backend Password Strength Validation", () => {
  it("should fail passwords shorter than 12 characters", () => {
    expect(validatePasswordStrength("Short1")).toBe("Password must be at least 12 characters");
  });

  it("should fail passwords without uppercase letters", () => {
    expect(validatePasswordStrength("lowercase12345")).toBe("Password must include at least one uppercase letter (A–Z)");
  });

  it("should fail passwords without lowercase letters", () => {
    expect(validatePasswordStrength("UPPERCASE12345")).toBe("Password must include at least one lowercase letter (a–z)");
  });

  it("should fail passwords without numbers", () => {
    expect(validatePasswordStrength("NoNumberPassword")).toBe("Password must include at least one number (0–9)");
  });

  it("should pass strong passwords meeting all criteria", () => {
    expect(validatePasswordStrength("StrongPassword123")).toBeNull();
  });
});
