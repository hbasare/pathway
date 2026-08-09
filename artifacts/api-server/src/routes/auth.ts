import { Router } from "express";
import bcrypt from "bcryptjs";
import { db } from "@workspace/db";
import { usersTable, organizationsTable, theoryAssignmentsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { loginLimiter, registerLimiter, passwordResetLimiter } from "../middleware/rate-limit";
import { validatePasswordStrength } from "../lib/password";
import { requireSystemAdmin } from "../middleware/auth";
import crypto from "crypto";
import { sendPasswordResetEmail, sendUsernameRecoveryEmail } from "../lib/email";

const router = Router();

// ── Login ─────────────────────────────────────────────────────────────────────
router.post("/auth/login", loginLimiter, async (req, res) => {
  const { username, password } = req.body as { username?: string; password?: string };
  if (!username || !password) {
    res.status(400).json({ error: "Username and password are required" });
    return;
  }

  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.username, username.trim().toLowerCase()));

  // Constant-time comparison even on invalid user to prevent user enumeration
  const dummyHash = "$2b$12$invalidhashfortimingattackprotection000000000000000000000";
  const valid = user
    ? await bcrypt.compare(password, user.passwordHash)
    : await bcrypt.compare(password, dummyHash).then(() => false);

  if (!user || !valid) {
    res.status(401).json({ error: "Invalid username or password" });
    return;
  }

  const org = user.orgId
    ? (await db.select().from(organizationsTable).where(eq(organizationsTable.id, user.orgId)))[0]
    : null;

  // Regenerate session ID on login to prevent session fixation attacks.
  await new Promise<void>((resolve, reject) =>
    req.session.regenerate(err => (err ? reject(err) : resolve()))
  );

  req.session.userId = user.id;
  req.session.orgId = user.orgId as any;
  req.session.role = user.role;
  req.session.username = user.username;
  req.session.displayName = user.displayName;
  req.session.orgName = org?.name ?? "";

  res.json({
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    role: user.role,
    orgId: user.orgId,
    orgName: org?.name ?? "",
    email: user.email,
    mustChangePassword: user.mustChangePassword,
  });
});

// ── Logout ────────────────────────────────────────────────────────────────────
router.post("/auth/logout", (req, res) => {
  req.session.destroy(() => {
    // Clear the session cookie from the browser even if session destruction fails
    res.clearCookie("pathways.sid");
    res.json({ ok: true });
  });
});

// ── Me ────────────────────────────────────────────────────────────────────────
router.get("/auth/me", async (req, res) => {
  if (!req.session?.userId) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  const [user] = await db
    .select({
      id: usersTable.id,
      orgId: usersTable.orgId,
      username: usersTable.username,
      displayName: usersTable.displayName,
      role: usersTable.role,
      email: usersTable.email,
      mustChangePassword: usersTable.mustChangePassword,
    })
    .from(usersTable)
    .where(eq(usersTable.id, req.session.userId));

  if (!user) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  const activeOrgId = user.role === "system_admin" ? (req.session.orgId ?? null) : user.orgId;

  const org = activeOrgId
    ? (await db.select().from(organizationsTable).where(eq(organizationsTable.id, activeOrgId)))[0]
    : null;

  let assignedTheoryIds: number[] = [];
  if (user.role === "member") {
    const rows = await db
      .select({ theoryId: theoryAssignmentsTable.theoryId })
      .from(theoryAssignmentsTable)
      .where(eq(theoryAssignmentsTable.userId, user.id));
    assignedTheoryIds = rows.map(r => r.theoryId);
  }
  res.json({
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    role: user.role,
    orgId: activeOrgId,
    orgName: org?.name ?? "",
    email: user.email,
    mustChangePassword: user.mustChangePassword,
    assignedTheoryIds,
  });
});

// ── Change Own Password (authenticated users) ─────────────────────────────────
router.post("/auth/change-password", async (req, res) => {
  if (!req.session?.userId) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  const { oldPassword, newPassword } = req.body as { oldPassword?: string; newPassword?: string };
  if (!oldPassword || !newPassword) {
    res.status(400).json({ error: "Current password and new password are required" });
    return;
  }

  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, req.session.userId));

  if (!user) {
    res.status(401).json({ error: "User not found" });
    return;
  }

  const valid = await bcrypt.compare(oldPassword, user.passwordHash);
  if (!valid) {
    res.status(401).json({ error: "Invalid current password" });
    return;
  }

  const pwError = validatePasswordStrength(newPassword);
  if (pwError) {
    res.status(400).json({ error: pwError });
    return;
  }

  const passwordHash = await bcrypt.hash(newPassword, 12);
  await db
    .update(usersTable)
    .set({
      passwordHash,
      mustChangePassword: false,
    })
    .where(eq(usersTable.id, req.session.userId));

  res.json({ ok: true });
});

// ── Register new organization (open to anyone) ────────────────────────────────
router.post("/register", registerLimiter, async (req, res) => {
  const { orgName, username, password, displayName } = req.body as {
    orgName?: string;
    username?: string;
    password?: string;
    displayName?: string;
  };

  if (!orgName?.trim() || !username?.trim() || !password) {
    res.status(400).json({ error: "Organization name, username and password are required" });
    return;
  }
  const pwError = validatePasswordStrength(password);
  if (pwError) {
    res.status(400).json({ error: pwError });
    return;
  }

  // Check username not already taken within any org
  const [existing] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.username, username.trim().toLowerCase()));
  if (existing) {
    res.status(409).json({ error: "That username is already taken" });
    return;
  }

  const [org] = await db
    .insert(organizationsTable)
    .values({ name: orgName.trim() })
    .returning();

  const passwordHash = await bcrypt.hash(password, 12);
  const [user] = await db
    .insert(usersTable)
    .values({
      orgId: org.id,
      username: username.trim().toLowerCase(),
      passwordHash,
      displayName: (displayName?.trim() || username.trim()),
      role: "manager",
    })
    .returning();

  // Regenerate session ID to prevent session fixation
  await new Promise<void>((resolve, reject) =>
    req.session.regenerate(err => (err ? reject(err) : resolve()))
  );

  req.session.userId = user.id;
  req.session.orgId = org.id;
  req.session.role = "manager";
  req.session.username = user.username;
  req.session.displayName = user.displayName;
  req.session.orgName = org.name;

  res.status(201).json({
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    role: user.role,
    orgId: org.id,
    orgName: org.name,
  });
});

// ── Check if app is set up ────────────────────────────────────────────────────
router.get("/setup/status", async (_req, res) => {
  const [org] = await db.select().from(organizationsTable).limit(1);
  res.json({ isSetUp: !!org });
});

// ── First-run setup ───────────────────────────────────────────────────────────
router.post("/setup", registerLimiter, async (req, res) => {
  // Only allowed if no org exists yet
  const [existing] = await db.select().from(organizationsTable).limit(1);
  if (existing) {
    res.status(400).json({ error: "App is already set up" });
    return;
  }

  const { orgName, username, password, displayName } = req.body as {
    orgName?: string;
    username?: string;
    password?: string;
    displayName?: string;
  };

  if (!orgName?.trim() || !username?.trim() || !password) {
    res.status(400).json({ error: "Organization name, username and password are required" });
    return;
  }
  const pwError = validatePasswordStrength(password);
  if (pwError) {
    res.status(400).json({ error: pwError });
    return;
  }

  // Create org
  const [org] = await db
    .insert(organizationsTable)
    .values({ name: orgName.trim() })
    .returning();

  // Assign any existing portfolios to this org
  const { portfoliosTable } = await import("@workspace/db");
  await db
    .update(portfoliosTable)
    .set({ orgId: org.id });

  // Create manager user
  const passwordHash = await bcrypt.hash(password, 12);
  const [user] = await db
    .insert(usersTable)
    .values({
      orgId: org.id,
      username: username.trim().toLowerCase(),
      passwordHash,
      displayName: (displayName?.trim() || username.trim()),
      role: "manager",
    })
    .returning();

  // Regenerate session ID to prevent session fixation
  await new Promise<void>((resolve, reject) =>
    req.session.regenerate(err => (err ? reject(err) : resolve()))
  );

  req.session.userId = user.id;
  req.session.orgId = org.id;
  req.session.role = "manager";
  req.session.username = user.username;
  req.session.displayName = user.displayName;
  req.session.orgName = org.name;

  res.status(201).json({
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    role: user.role,
    orgId: org.id,
    orgName: org.name,
  });
});

// ── Admin: List all organizations (for tenant-switching) ───────────────────
router.get("/admin/organizations", requireSystemAdmin, async (_req, res) => {
  const orgs = await db.select().from(organizationsTable).orderBy(organizationsTable.name);
  res.json(orgs);
});

// ── Admin: Create a new organization ─────────────────────────────────────────
router.post("/admin/organizations", requireSystemAdmin, async (req, res) => {
  const { name } = req.body as { name?: string };
  if (!name?.trim()) {
    res.status(400).json({ error: "Organization name is required" });
    return;
  }
  try {
    const [org] = await db
      .insert(organizationsTable)
      .values({ name: name.trim() })
      .returning();
    res.status(201).json(org);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── Admin: Update organization name ──────────────────────────────────────────
router.patch("/admin/organizations/:id", requireSystemAdmin, async (req, res) => {
  const id = Number(req.params.id);
  const { name } = req.body as { name?: string };
  if (!name?.trim()) {
    res.status(400).json({ error: "Organization name is required" });
    return;
  }
  try {
    const [org] = await db
      .update(organizationsTable)
      .set({ name: name.trim() })
      .where(eq(organizationsTable.id, id))
      .returning();
    if (!org) {
      res.status(404).json({ error: "Organization not found" });
      return;
    }
    res.json(org);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── Admin: Switch active organization context ────────────────────────────────
router.post("/admin/switch-tenant", requireSystemAdmin, async (req, res) => {
  const { orgId } = req.body as { orgId?: number | null };

  if (orgId === null || orgId === undefined || orgId === 0) {
    // Reset back to system-wide master view
    req.session.orgId = null as any;
    req.session.orgName = "";
    res.json({ orgId: null, orgName: "" });
    return;
  }

  const [org] = await db
    .select()
    .from(organizationsTable)
    .where(eq(organizationsTable.id, orgId));

  if (!org) {
    res.status(404).json({ error: "Organization not found" });
    return;
  }

  req.session.orgId = org.id;
  req.session.orgName = org.name;

  res.json({ orgId: org.id, orgName: org.name });
});

// ── Password Recovery: Forgot Password ────────────────────────────────────────
router.post("/auth/forgot-password", passwordResetLimiter, async (req, res) => {
  const { email } = req.body as { email?: string };

  if (!email || !email.trim()) {
    res.status(400).json({ error: "Email is required" });
    return;
  }

  // To prevent user enumeration, we always return success
  res.json({ message: "If a matching account exists, a password reset link has been sent." });

  try {
    const users = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.email, email.trim()));

    if (users.length === 0) {
      return;
    }

    // Generate token
    const token = crypto.randomBytes(32).toString("hex");
    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");
    const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now

    // Update all matching users with this email just in case
    for (const u of users) {
      await db
        .update(usersTable)
        .set({ resetToken: hashedToken, resetTokenExpires: expires })
        .where(eq(usersTable.id, u.id));
    }

    // Send reset email
    await sendPasswordResetEmail(email.trim(), token);
  } catch (err) {
    console.error("Forgot password request failed:", err);
  }
});

// ── Password Recovery: Reset Password ─────────────────────────────────────────
router.post("/auth/reset-password", passwordResetLimiter, async (req, res) => {
  const { token, newPassword } = req.body as { token?: string; newPassword?: string };

  if (!token || !token.trim()) {
    res.status(400).json({ error: "Token is required" });
    return;
  }

  if (!newPassword) {
    res.status(400).json({ error: "Password is required" });
    return;
  }

  const pwError = validatePasswordStrength(newPassword);
  if (pwError) {
    res.status(400).json({ error: pwError });
    return;
  }

  try {
    const hashedToken = crypto.createHash("sha256").update(token.trim()).digest("hex");

    // Find user with this token
    const users = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.resetToken, hashedToken));

    if (users.length === 0) {
      res.status(400).json({ error: "Invalid or expired reset token" });
      return;
    }

    const user = users[0];
    if (!user.resetTokenExpires || user.resetTokenExpires < new Date()) {
      res.status(400).json({ error: "Invalid or expired reset token" });
      return;
    }

    // Hash new password and clear token
    const passwordHash = await bcrypt.hash(newPassword, 12);
    await db
      .update(usersTable)
      .set({
        passwordHash,
        mustChangePassword: false,
        resetToken: null,
        resetTokenExpires: null,
      })
      .where(eq(usersTable.id, user.id));

    res.json({ message: "Password updated successfully" });
  } catch (err) {
    console.error("Reset password failed:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── Username Recovery: Forgot Username ────────────────────────────────────────
router.post("/auth/forgot-username", passwordResetLimiter, async (req, res) => {
  const { email } = req.body as { email?: string };

  if (!email || !email.trim()) {
    res.status(400).json({ error: "Email is required" });
    return;
  }

  // To prevent user enumeration, we always return success
  res.json({ message: "If a matching account exists, your username recovery email has been sent." });

  try {
    const users = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.email, email.trim()));

    if (users.length === 0) {
      return;
    }

    const usernames = users.map(u => u.username);
    await sendUsernameRecoveryEmail(email.trim(), usernames);
  } catch (err) {
    console.error("Forgot username request failed:", err);
  }
});

export default router;
