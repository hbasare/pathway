import { Router } from "express";
import bcrypt from "bcryptjs";
import { db } from "@workspace/db";
import { usersTable, theoryAssignmentsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth, requireManager } from "../middleware/auth";
import { passwordResetLimiter } from "../middleware/rate-limit";
import { validatePasswordStrength } from "../lib/password";
import { sendWelcomeEmail } from "../lib/email";
import { randomBytes } from "crypto";

const router = Router();

// ── List users in the org ────────────────────────────────────────────────────
router.get("/users", requireAuth, async (req, res) => {
  const orgId = req.session.orgId;
  const isGlobalAdmin = req.session.role === "system_admin" && !orgId;

  const query = db
    .select({
      id: usersTable.id,
      username: usersTable.username,
      displayName: usersTable.displayName,
      role: usersTable.role,
      orgId: usersTable.orgId,
      email: usersTable.email,
      mustChangePassword: usersTable.mustChangePassword,
      createdAt: usersTable.createdAt,
    })
    .from(usersTable);

  const users = isGlobalAdmin
    ? await query
    : await query.where(eq(usersTable.orgId, orgId!));

  res.json(users);
});

// ── Create a user (manager only) ─────────────────────────────────────────────
router.post("/users", requireManager, async (req, res) => {
  const orgId = req.session.orgId;
  const isGlobalAdmin = req.session.role === "system_admin" && !orgId;

  const { username, password, displayName, role, email } = req.body as {
    username?: string;
    password?: string;
    displayName?: string;
    role?: string;
    email?: string;
  };

  if (!username?.trim()) {
    res.status(400).json({ error: "Username is required" });
    return;
  }

  // If no password is provided, we must require email so we can send the temporary password
  if (!password && !email?.trim()) {
    res.status(400).json({ error: "Password or email is required to register a user" });
    return;
  }

  if (email?.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    res.status(400).json({ error: "Invalid email address format" });
    return;
  }

  let tempPassword = "";
  let isTemp = false;
  let actualPassword = password;

  if (!actualPassword) {
    // Generate a temporary password that satisfies our strength verification (at least 8 chars, mixed case, digit, special char)
    const rand = randomBytes(4).toString("hex");
    tempPassword = `Tmp-${rand}!`;
    actualPassword = tempPassword;
    isTemp = true;
  } else {
    // Validate strength of provided password
    const pwError = validatePasswordStrength(actualPassword);
    if (pwError) {
      res.status(400).json({ error: pwError });
      return;
    }
  }

  const validRoles = ["system_admin", "manager", "member", "senior_manager", "auditor", "donor"];
  const userRole = validRoles.includes(role ?? "") ? role! : "member";

  if (userRole === "system_admin" && req.session.role !== "system_admin") {
    res.status(403).json({ error: "Only system administrators can create other system administrators" });
    return;
  }

  const targetOrgId = isGlobalAdmin ? (req.body.orgId ? Number(req.body.orgId) : null) : orgId!;
  const passwordHash = await bcrypt.hash(actualPassword, 12);

  try {
    const [user] = await db
      .insert(usersTable)
      .values({
        orgId: targetOrgId as any,
        username: username.trim().toLowerCase(),
        passwordHash,
        displayName: (displayName?.trim() || username.trim()),
        role: userRole,
        email: email?.trim() || null,
        mustChangePassword: isTemp,
      })
      .returning({
        id: usersTable.id,
        username: usersTable.username,
        displayName: usersTable.displayName,
        role: usersTable.role,
        orgId: usersTable.orgId,
        email: usersTable.email,
        mustChangePassword: usersTable.mustChangePassword,
        createdAt: usersTable.createdAt,
      });

    // Send welcome email if temporary password was generated and email is provided
    if (isTemp && email?.trim()) {
      try {
        await sendWelcomeEmail(email.trim(), username.trim(), tempPassword);
      } catch (mailErr) {
        console.error("Failed to send welcome email:", mailErr);
      }
    }

    res.status(201).json(user);
  } catch (err) {
    res.status(409).json({ error: "Username already taken" });
  }
});

// ── Update a user's role or display name (manager only) ──────────────────────
router.patch("/users/:id", requireManager, async (req, res) => {
  const id = Number(req.params.id);
  const orgId = req.session.orgId;
  const isGlobalAdmin = req.session.role === "system_admin" && !orgId;
  const { role, displayName } = req.body as { role?: string; displayName?: string };

  const updates: Record<string, unknown> = {};
  const validRoles = ["system_admin", "manager", "member", "senior_manager", "auditor", "donor"];
  if (role && validRoles.includes(role)) {
    if (role === "system_admin" && req.session.role !== "system_admin") {
      res.status(403).json({ error: "Only system administrators can assign the system_admin role" });
      return;
    }
    updates.role = role;
  }
  if (displayName?.trim()) updates.displayName = displayName.trim();

  if (Object.keys(updates).length === 0) {
    res.status(400).json({ error: "Nothing to update" });
    return;
  }

  const query = db.update(usersTable).set(updates);
  const [user] = isGlobalAdmin
    ? await query.where(eq(usersTable.id, id)).returning({
        id: usersTable.id,
        username: usersTable.username,
        displayName: usersTable.displayName,
        role: usersTable.role,
      })
    : await query.where(and(eq(usersTable.id, id), eq(usersTable.orgId, orgId!))).returning({
        id: usersTable.id,
        username: usersTable.username,
        displayName: usersTable.displayName,
        role: usersTable.role,
      });

  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  res.json(user);
});

// ── Reset a user's password (manager only) ───────────────────────────────────
router.patch("/users/:id/password", requireManager, passwordResetLimiter, async (req, res) => {
  const id = Number(req.params.id);
  const orgId = req.session.orgId;
  const isGlobalAdmin = req.session.role === "system_admin" && !orgId;
  const { password } = req.body as { password?: string };

  if (!password) {
    res.status(400).json({ error: "Password is required" });
    return;
  }
  const pwError = validatePasswordStrength(password);
  if (pwError) {
    res.status(400).json({ error: pwError });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const query = db.update(usersTable).set({ passwordHash });
  const [user] = isGlobalAdmin
    ? await query.where(eq(usersTable.id, id)).returning({ id: usersTable.id })
    : await query.where(and(eq(usersTable.id, id), eq(usersTable.orgId, orgId!))).returning({ id: usersTable.id });

  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  res.json({ ok: true });
});

// ── Get theories assigned to a user (manager only) ───────────────────────────
router.get("/users/:id/assignments", requireManager, async (req, res) => {
  const userId = Number(req.params.id);
  const orgId = req.session.orgId;
  const isGlobalAdmin = req.session.role === "system_admin" && !orgId;

  const query = db
    .select({ theoryId: theoryAssignmentsTable.theoryId })
    .from(theoryAssignmentsTable);

  const rows = isGlobalAdmin
    ? await query.where(eq(theoryAssignmentsTable.userId, userId))
    : await query.where(and(
        eq(theoryAssignmentsTable.userId, userId),
        eq(theoryAssignmentsTable.orgId, orgId!)
      ));

  res.json(rows.map(r => r.theoryId));
});

// ── Delete a user (manager only) ─────────────────────────────────────────────
router.delete("/users/:id", requireManager, async (req, res) => {
  const id = Number(req.params.id);
  const orgId = req.session.orgId;
  const isGlobalAdmin = req.session.role === "system_admin" && !orgId;

  // Prevent deleting yourself
  if (id === req.session.userId) {
    res.status(400).json({ error: "You cannot remove your own account" });
    return;
  }

  const query = db.delete(usersTable);
  if (isGlobalAdmin) {
    await query.where(eq(usersTable.id, id));
  } else {
    await query.where(and(eq(usersTable.id, id), eq(usersTable.orgId, orgId!)));
  }

  res.json({ ok: true });
});

export default router;
