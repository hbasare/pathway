import { Router } from "express";
import bcrypt from "bcryptjs";
import { db } from "@workspace/db";
import { usersTable, organizationsTable, theoryAssignmentsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

// ── Login ─────────────────────────────────────────────────────────────────────
router.post("/auth/login", async (req, res) => {
  const { username, password } = req.body as { username?: string; password?: string };
  if (!username || !password) {
    res.status(400).json({ error: "Username and password are required" });
    return;
  }

  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.username, username.trim().toLowerCase()));

  if (!user) {
    res.status(401).json({ error: "Invalid username or password" });
    return;
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    res.status(401).json({ error: "Invalid username or password" });
    return;
  }

  const [org] = await db
    .select()
    .from(organizationsTable)
    .where(eq(organizationsTable.id, user.orgId));

  req.session.userId = user.id;
  req.session.orgId = user.orgId;
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
  });
});

// ── Logout ────────────────────────────────────────────────────────────────────
router.post("/auth/logout", (req, res) => {
  req.session.destroy(() => {
    res.json({ ok: true });
  });
});

// ── Me ────────────────────────────────────────────────────────────────────────
router.get("/auth/me", async (req, res) => {
  if (!req.session?.userId) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  let assignedTheoryIds: number[] = [];
  if (req.session.role === "member") {
    const rows = await db
      .select({ theoryId: theoryAssignmentsTable.theoryId })
      .from(theoryAssignmentsTable)
      .where(eq(theoryAssignmentsTable.userId, req.session.userId));
    assignedTheoryIds = rows.map(r => r.theoryId);
  }
  res.json({
    id: req.session.userId,
    username: req.session.username,
    displayName: req.session.displayName,
    role: req.session.role,
    orgId: req.session.orgId,
    orgName: req.session.orgName,
    assignedTheoryIds,
  });
});

// ── Register new organization (open to anyone) ────────────────────────────────
router.post("/register", async (req, res) => {
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
  if (password.length < 8) {
    res.status(400).json({ error: "Password must be at least 8 characters" });
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
router.post("/setup", async (req, res) => {
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
  if (password.length < 8) {
    res.status(400).json({ error: "Password must be at least 8 characters" });
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

  // Auto login
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

export default router;
