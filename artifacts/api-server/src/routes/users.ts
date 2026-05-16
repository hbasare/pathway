import { Router } from "express";
import bcrypt from "bcryptjs";
import { db } from "@workspace/db";
import { usersTable, theoryAssignmentsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth, requireManager } from "../middleware/auth";
import { passwordResetLimiter } from "../middleware/rate-limit";
import { validatePasswordStrength } from "../lib/password";

const router = Router();

// ── List users in the org ────────────────────────────────────────────────────
router.get("/users", requireAuth, async (req, res) => {
  const users = await db
    .select({
      id: usersTable.id,
      username: usersTable.username,
      displayName: usersTable.displayName,
      role: usersTable.role,
      createdAt: usersTable.createdAt,
    })
    .from(usersTable)
    .where(eq(usersTable.orgId, req.session.orgId!));

  res.json(users);
});

// ── Create a user (manager only) ─────────────────────────────────────────────
router.post("/users", requireManager, async (req, res) => {
  const { username, password, displayName, role } = req.body as {
    username?: string;
    password?: string;
    displayName?: string;
    role?: string;
  };

  if (!username?.trim() || !password) {
    res.status(400).json({ error: "Username and password are required" });
    return;
  }
  const pwError = validatePasswordStrength(password);
  if (pwError) {
    res.status(400).json({ error: pwError });
    return;
  }
  const validRoles = ["manager", "member", "senior_manager", "auditor", "donor"];
  const userRole = validRoles.includes(role ?? "") ? role! : "member";

  const passwordHash = await bcrypt.hash(password, 12);

  try {
    const [user] = await db
      .insert(usersTable)
      .values({
        orgId: req.session.orgId!,
        username: username.trim().toLowerCase(),
        passwordHash,
        displayName: (displayName?.trim() || username.trim()),
        role: userRole,
      })
      .returning({
        id: usersTable.id,
        username: usersTable.username,
        displayName: usersTable.displayName,
        role: usersTable.role,
        createdAt: usersTable.createdAt,
      });
    res.status(201).json(user);
  } catch {
    res.status(409).json({ error: "Username already taken" });
  }
});

// ── Update a user's role or display name (manager only) ──────────────────────
router.patch("/users/:id", requireManager, async (req, res) => {
  const id = Number(req.params.id);
  const { role, displayName } = req.body as { role?: string; displayName?: string };

  const updates: Record<string, unknown> = {};
  if (role && ["manager", "member", "senior_manager", "auditor", "donor"].includes(role)) updates.role = role;
  if (displayName?.trim()) updates.displayName = displayName.trim();

  if (Object.keys(updates).length === 0) {
    res.status(400).json({ error: "Nothing to update" });
    return;
  }

  const [user] = await db
    .update(usersTable)
    .set(updates)
    .where(and(eq(usersTable.id, id), eq(usersTable.orgId, req.session.orgId!)))
    .returning({
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
  const [user] = await db
    .update(usersTable)
    .set({ passwordHash })
    .where(and(eq(usersTable.id, id), eq(usersTable.orgId, req.session.orgId!)))
    .returning({ id: usersTable.id });

  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  res.json({ ok: true });
});

// ── Get theories assigned to a user (manager only) ───────────────────────────
router.get("/users/:id/assignments", requireManager, async (req, res) => {
  const userId = Number(req.params.id);
  const rows = await db
    .select({ theoryId: theoryAssignmentsTable.theoryId })
    .from(theoryAssignmentsTable)
    .where(and(
      eq(theoryAssignmentsTable.userId, userId),
      eq(theoryAssignmentsTable.orgId, req.session.orgId!)
    ));
  res.json(rows.map(r => r.theoryId));
});

// ── Delete a user (manager only) ─────────────────────────────────────────────
router.delete("/users/:id", requireManager, async (req, res) => {
  const id = Number(req.params.id);

  // Prevent deleting yourself
  if (id === req.session.userId) {
    res.status(400).json({ error: "You cannot remove your own account" });
    return;
  }

  await db
    .delete(usersTable)
    .where(and(eq(usersTable.id, id), eq(usersTable.orgId, req.session.orgId!)));

  res.json({ ok: true });
});

export default router;
