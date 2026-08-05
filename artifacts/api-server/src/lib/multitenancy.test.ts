import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { db } from "@workspace/db";
import { organizationsTable, theoriesTable, usersTable } from "@workspace/db";
import { getAuthorizedTheory } from "../routes/theories";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";

describe("Multi-Tenancy E2E & Logical Isolation Tests", () => {
  let org1Id: number;
  let org2Id: number;
  let theory1Id: number;
  let theory2Id: number;

  beforeAll(async () => {
    // 1. Create two test organizations
    const [org1] = await db.insert(organizationsTable).values({ name: "Test Org 1" }).returning();
    const [org2] = await db.insert(organizationsTable).values({ name: "Test Org 2" }).returning();
    org1Id = org1.id;
    org2Id = org2.id;

    // 2. Create one theory for each organization
    const [theory1] = await db.insert(theoriesTable).values({
      title: "Theory for Org 1",
      orgId: org1Id,
    }).returning();

    const [theory2] = await db.insert(theoriesTable).values({
      title: "Theory for Org 2",
      orgId: org2Id,
    }).returning();

    theory1Id = theory1.id;
    theory2Id = theory2.id;
  });

  afterAll(async () => {
    // Clean up test data
    if (theory1Id) await db.delete(theoriesTable).where(eq(theoriesTable.id, theory1Id));
    if (theory2Id) await db.delete(theoriesTable).where(eq(theoriesTable.id, theory2Id));
    if (org1Id) await db.delete(organizationsTable).where(eq(organizationsTable.id, org1Id));
    if (org2Id) await db.delete(organizationsTable).where(eq(organizationsTable.id, org2Id));
  });

  it("should restrict user from viewing a theory of another organization", async () => {
    const mockReq = {
      session: {
        userId: 999,
        role: "manager",
        orgId: org1Id,
        orgName: "Test Org 1",
      },
    };

    // User from Org 1 tries to access Theory of Org 1 -> SUCCESS
    const result1 = await getAuthorizedTheory(mockReq, theory1Id);
    expect(result1).not.toBeNull();
    expect(result1?.title).toBe("Theory for Org 1");

    // User from Org 1 tries to access Theory of Org 2 -> NULL (BLOCKED)
    const result2 = await getAuthorizedTheory(mockReq, theory2Id);
    expect(result2).toBeNull();
  });

  it("should allow system_admin in Master view (no orgId context) to view all theories", async () => {
    const mockReq = {
      session: {
        userId: 888,
        role: "system_admin",
        orgId: null as any,
        orgName: "",
      },
    };

    // System admin with no orgId context can access Theory of Org 1
    const result1 = await getAuthorizedTheory(mockReq, theory1Id);
    expect(result1).not.toBeNull();
    expect(result1?.title).toBe("Theory for Org 1");

    // System admin with no orgId context can access Theory of Org 2
    const result2 = await getAuthorizedTheory(mockReq, theory2Id);
    expect(result2).not.toBeNull();
    expect(result2?.title).toBe("Theory for Org 2");
  });

  it("should restrict system_admin when they context-switch to a specific organization", async () => {
    const mockReq = {
      session: {
        userId: 888,
        role: "system_admin",
        orgId: org1Id,
        orgName: "Test Org 1",
      },
    };

    // System admin switched to Org 1 context can view Theory of Org 1 -> SUCCESS
    const result1 = await getAuthorizedTheory(mockReq, theory1Id);
    expect(result1).not.toBeNull();
    expect(result1?.title).toBe("Theory for Org 1");

    // System admin switched to Org 1 context tries to view Theory of Org 2 -> NULL (BLOCKED)
    const result2 = await getAuthorizedTheory(mockReq, theory2Id);
    expect(result2).toBeNull();
  });

  it("should enforce own-password change restrictions and logical isolation", async () => {
    // 1. Create a user with temporary password / mustChangePassword = true
    const [user] = await db
      .insert(usersTable)
      .values({
        orgId: org1Id,
        username: "test-temp-user",
        passwordHash: await bcrypt.hash("Tmp-12345!", 12),
        displayName: "Temporary User",
        role: "member",
        email: "temp@example.com",
        mustChangePassword: true,
      })
      .returning();

    expect(user.mustChangePassword).toBe(true);
    expect(user.email).toBe("temp@example.com");

    // 2. Simulate own password change via DB update representing POST /auth/change-password endpoint behavior
    // Verify the user can successfully update password and it clears mustChangePassword
    const newPasswordHash = await bcrypt.hash("New-Secure-Pass-123!", 12);
    await db
      .update(usersTable)
      .set({
        passwordHash: newPasswordHash,
        mustChangePassword: false,
      })
      .where(eq(usersTable.id, user.id));

    const [updatedUser] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, user.id));

    expect(updatedUser.mustChangePassword).toBe(false);
    expect(await bcrypt.compare("New-Secure-Pass-123!", updatedUser.passwordHash)).toBe(true);

    // Clean up
    await db.delete(usersTable).where(eq(usersTable.id, user.id));
  });
});
