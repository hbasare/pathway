import { describe, it, expect } from "vitest";
import { getPasswordError, isPasswordValid } from "./password";

describe("Frontend Password Helpers", () => {
  describe("getPasswordError", () => {
    it("should return correct error for short password", () => {
      expect(getPasswordError("Weak1")).toBe("Password must be at least 12 characters");
    });

    it("should return correct error for password missing uppercase", () => {
      expect(getPasswordError("lowercase12345")).toBe("Password must include an uppercase letter");
    });

    it("should return correct error for password missing lowercase", () => {
      expect(getPasswordError("UPPERCASE12345")).toBe("Password must include a lowercase letter");
    });

    it("should return correct error for password missing numbers", () => {
      expect(getPasswordError("NoNumberPassword")).toBe("Password must include a number");
    });

    it("should return null for a valid password", () => {
      expect(getPasswordError("ValidPassword123")).toBeNull();
    });
  });

  describe("isPasswordValid", () => {
    it("should return false for invalid passwords", () => {
      expect(isPasswordValid("weak")).toBe(false);
    });

    it("should return true for valid passwords", () => {
      expect(isPasswordValid("ValidPassword123")).toBe(true);
    });
  });
});
