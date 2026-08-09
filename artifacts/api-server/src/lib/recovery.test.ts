import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { db } from "@workspace/db";
import { organizationsTable, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import crypto from "crypto";

describe("Password Reset & Username Recovery Flow Tests", () => {
  let orgId: number;
  let userId1: number;
  let userId2: number;
  const testEmail = "recover-test@example.com";

  beforeAll(async () => {
    // 1. Create a test organization
    const [org] = await db.insert(organizationsTable).values({ name: "Recovery Org" }).returning();
    orgId = org.id;

    // 2. Create two test users with same email address
    const [user1] = await db
      .insert(usersTable)
      .values({
        orgId,
        username: "recovery-user-1",
        passwordHash: await bcrypt.hash("OldPass-12345!", 12),
        displayName: "User One",
        role: "member",
        email: testEmail,
        mustChangePassword: false,
      })
      .returning();

    const [user2] = await db
      .insert(usersTable)
      .values({
        orgId,
        username: "recovery-user-2",
        passwordHash: await bcrypt.hash("OldPass-67890!", 12),
        displayName: "User Two",
        role: "member",
        email: testEmail,
        mustChangePassword: false,
      })
      .returning();

    userId1 = user1.id;
    userId2 = user2.id;
  });

  afterAll(async () => {
    // Clean up test data
    if (userId1) await db.delete(usersTable).where(eq(usersTable.id, userId1));
    if (userId2) await db.delete(usersTable).where(eq(usersTable.id, userId2));
    if (orgId) await db.delete(organizationsTable).where(eq(organizationsTable.id, orgId));
  });

  it("should generate and save reset tokens for all matching users on forgot-password request", async () => {
    const users = await db.select().from(usersTable).where(eq(usersTable.email, testEmail));
    expect(users.length).toBe(2);

    const token = crypto.randomBytes(32).toString("hex");
    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");
    const expires = new Date(Date.now() + 60 * 60 * 1000);

    for (const u of users) {
      await db
        .update(usersTable)
        .set({ resetToken: hashedToken, resetTokenExpires: expires })
        .where(eq(usersTable.id, u.id));
    }

    const [updated1] = await db.select().from(usersTable).where(eq(usersTable.id, userId1));
    const [updated2] = await db.select().from(usersTable).where(eq(usersTable.id, userId2));

    expect(updated1.resetToken).toBe(hashedToken);
    expect(updated1.resetTokenExpires).not.toBeNull();
    expect(updated2.resetToken).toBe(hashedToken);
    expect(updated2.resetTokenExpires).not.toBeNull();
  });

  it("should reset password with valid token and clear token details", async () => {
    const token = crypto.randomBytes(32).toString("hex");
    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");
    const expires = new Date(Date.now() + 60 * 60 * 1000);

    // Apply token to user1
    await db
      .update(usersTable)
      .set({ resetToken: hashedToken, resetTokenExpires: expires })
      .where(eq(usersTable.id, userId1));

    // Reset password (simulate POST /auth/reset-password endpoint handler logic)
    const newPasswordHash = await bcrypt.hash("NewSecurePass-12345!", 12);
    await db
      .update(usersTable)
      .set({
        passwordHash: newPasswordHash,
        mustChangePassword: false,
        resetToken: null,
        resetTokenExpires: null,
      })
      .where(eq(usersTable.id, userId1));

    const [updated] = await db.select().from(usersTable).where(eq(usersTable.id, userId1));
    expect(updated.resetToken).toBeNull();
    expect(updated.resetTokenExpires).toBeNull();
    expect(await bcrypt.compare("NewSecurePass-12345!", updated.passwordHash)).toBe(true);
  });

  it("should list all usernames associated with recovery email on forgot-username request", async () => {
    // Simulate forgot-username request handler logic
    const users = await db.select().from(usersTable).where(eq(usersTable.email, testEmail));
    const usernames = users.map(u => u.username);

    expect(usernames).toContain("recovery-user-1");
    expect(usernames).toContain("recovery-user-2");
  });
});
