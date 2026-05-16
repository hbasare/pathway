import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import {
  theoriesTable,
  componentsTable,
  connectionsTable,
  componentIndicatorsTable,
  theoryNotesUpdatesTable,
  theoryRiskAnalysesTable,
  indicatorScYearsTable,
  theoryAssignmentsTable,
  usersTable,
  insertTheorySchema,
  insertComponentSchema,
  insertConnectionSchema,
  insertComponentIndicatorSchema,
  insertTheoryNoteUpdateSchema,
  insertTheoryRiskAnalysisSchema,
  insertIndicatorScYearSchema,
} from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireManager } from "../middleware/auth";

const router: IRouter = Router();

router.get("/theories", async (_req, res) => {
  const theories = await db.select().from(theoriesTable).orderBy(theoriesTable.createdAt);
  res.json(theories);
});

router.post("/theories", async (req, res) => {
  const parsed = insertTheorySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues });
    return;
  }
  const [theory] = await db.insert(theoriesTable).values(parsed.data).returning();
  res.status(201).json(theory);
});

router.get("/theories/:id", async (req, res) => {
  const id = Number(req.params.id);
  const [theory] = await db.select().from(theoriesTable).where(eq(theoriesTable.id, id));
  if (!theory) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  const components = await db.select().from(componentsTable).where(eq(componentsTable.theoryId, id));
  const connections = await db.select().from(connectionsTable).where(eq(connectionsTable.theoryId, id));
  const allIndicators = await db
    .select()
    .from(componentIndicatorsTable)
    .where(eq(componentIndicatorsTable.theoryId, id))
    .orderBy(componentIndicatorsTable.position, componentIndicatorsTable.id);

  // Fetch sc year rows for all indicators in this theory
  const indicatorIds = allIndicators.map(ind => ind.id);
  let allScYears: (typeof indicatorScYearsTable.$inferSelect)[] = [];
  if (indicatorIds.length > 0) {
    const { inArray } = await import("drizzle-orm");
    allScYears = await db
      .select()
      .from(indicatorScYearsTable)
      .where(inArray(indicatorScYearsTable.indicatorId, indicatorIds))
      .orderBy(indicatorScYearsTable.position, indicatorScYearsTable.id);
  }

  const componentsWithIndicators = components.map(c => ({
    ...c,
    componentIndicators: allIndicators
      .filter(ind => ind.componentId === c.id)
      .map(ind => ({
        ...ind,
        scYears: allScYears.filter(y => y.indicatorId === ind.id),
      })),
  }));

  res.json({ ...theory, components: componentsWithIndicators, connections });
});

router.put("/theories/:id", async (req, res) => {
  const id = Number(req.params.id);
  const parsed = insertTheorySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues });
    return;
  }
  const [updated] = await db.update(theoriesTable)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(eq(theoriesTable.id, id))
    .returning();
  if (!updated) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json(updated);
});

router.delete("/theories/:id", async (req, res) => {
  const id = Number(req.params.id);
  await db.delete(theoriesTable).where(eq(theoriesTable.id, id));
  res.status(204).send();
});

router.get("/theories/:theoryId/components", async (req, res) => {
  const theoryId = Number(req.params.theoryId);
  const components = await db.select().from(componentsTable).where(eq(componentsTable.theoryId, theoryId));
  res.json(components);
});

router.post("/theories/:theoryId/components", async (req, res) => {
  const theoryId = Number(req.params.theoryId);
  const parsed = insertComponentSchema.safeParse({ ...req.body, theoryId });
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues });
    return;
  }
  const [component] = await db.insert(componentsTable).values(parsed.data).returning();
  res.status(201).json(component);
});

router.put("/theories/:theoryId/components/:id", async (req, res) => {
  const id = Number(req.params.id);
  const theoryId = Number(req.params.theoryId);
  const parsed = insertComponentSchema.safeParse({ ...req.body, theoryId });
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues });
    return;
  }
  const [updated] = await db.update(componentsTable)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(eq(componentsTable.id, id))
    .returning();
  if (!updated) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json(updated);
});

router.delete("/theories/:theoryId/components/:id", async (req, res) => {
  const id = Number(req.params.id);
  await db.delete(componentsTable).where(eq(componentsTable.id, id));
  res.status(204).send();
});

// Component Indicators CRUD
router.get("/theories/:theoryId/components/:componentId/indicators", async (req, res) => {
  const componentId = Number(req.params.componentId);
  const theoryId = Number(req.params.theoryId);
  const indicators = await db
    .select()
    .from(componentIndicatorsTable)
    .where(and(eq(componentIndicatorsTable.componentId, componentId), eq(componentIndicatorsTable.theoryId, theoryId)))
    .orderBy(componentIndicatorsTable.position, componentIndicatorsTable.id);
  res.json(indicators);
});

router.post("/theories/:theoryId/components/:componentId/indicators", async (req, res) => {
  const componentId = Number(req.params.componentId);
  const theoryId = Number(req.params.theoryId);
  const parsed = insertComponentIndicatorSchema.safeParse({ ...req.body, componentId, theoryId });
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues });
    return;
  }
  const [indicator] = await db.insert(componentIndicatorsTable).values(parsed.data).returning();
  res.status(201).json(indicator);
});

router.put("/theories/:theoryId/components/:componentId/indicators/:id", async (req, res) => {
  const id = Number(req.params.id);
  const componentId = Number(req.params.componentId);
  const theoryId = Number(req.params.theoryId);
  const parsed = insertComponentIndicatorSchema.safeParse({ ...req.body, componentId, theoryId });
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues });
    return;
  }
  const [updated] = await db.update(componentIndicatorsTable)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(eq(componentIndicatorsTable.id, id))
    .returning();
  if (!updated) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json(updated);
});

router.delete("/theories/:theoryId/components/:componentId/indicators/:id", async (req, res) => {
  const id = Number(req.params.id);
  await db.delete(componentIndicatorsTable).where(eq(componentIndicatorsTable.id, id));
  res.status(204).send();
});

router.get("/theories/:theoryId/connections", async (req, res) => {
  const theoryId = Number(req.params.theoryId);
  const connections = await db.select().from(connectionsTable).where(eq(connectionsTable.theoryId, theoryId));
  res.json(connections);
});

router.post("/theories/:theoryId/connections", async (req, res) => {
  const theoryId = Number(req.params.theoryId);
  const parsed = insertConnectionSchema.safeParse({ ...req.body, theoryId });
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues });
    return;
  }
  const [connection] = await db.insert(connectionsTable).values(parsed.data).returning();
  res.status(201).json(connection);
});

router.patch("/theories/:theoryId/connections/:id", async (req, res) => {
  const theoryId = Number(req.params.theoryId);
  const id = Number(req.params.id);
  const { startAnchor, endAnchor } = req.body;
  await db
    .update(connectionsTable)
    .set({ startAnchor: startAnchor ?? null, endAnchor: endAnchor ?? null })
    .where(and(eq(connectionsTable.id, id), eq(connectionsTable.theoryId, theoryId)));
  const [updated] = await db
    .select()
    .from(connectionsTable)
    .where(and(eq(connectionsTable.id, id), eq(connectionsTable.theoryId, theoryId)));
  res.json(updated);
});

router.delete("/theories/:theoryId/connections/:id", async (req, res) => {
  const id = Number(req.params.id);
  await db.delete(connectionsTable).where(eq(connectionsTable.id, id));
  res.status(204).send();
});

// ─── Risk Analyses ───────────────────────────────────────────────────────────

router.get("/theories/:theoryId/risk-analyses", async (req, res) => {
  const theoryId = Number(req.params.theoryId);
  const rows = await db
    .select()
    .from(theoryRiskAnalysesTable)
    .where(eq(theoryRiskAnalysesTable.theoryId, theoryId))
    .orderBy(theoryRiskAnalysesTable.position, theoryRiskAnalysesTable.id);
  res.json(rows);
});

router.post("/theories/:theoryId/risk-analyses", async (req, res) => {
  const theoryId = Number(req.params.theoryId);
  const parsed = insertTheoryRiskAnalysisSchema.safeParse({ ...req.body, theoryId });
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues });
    return;
  }
  const [row] = await db.insert(theoryRiskAnalysesTable).values(parsed.data).returning();
  res.status(201).json(row);
});

router.patch("/theories/:theoryId/risk-analyses/:id", async (req, res) => {
  const id = Number(req.params.id);
  const theoryId = Number(req.params.theoryId);
  const [row] = await db
    .update(theoryRiskAnalysesTable)
    .set({ ...req.body, updatedAt: new Date() })
    .where(and(eq(theoryRiskAnalysesTable.id, id), eq(theoryRiskAnalysesTable.theoryId, theoryId)))
    .returning();
  if (!row) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json(row);
});

router.delete("/theories/:theoryId/risk-analyses/:id", async (req, res) => {
  const id = Number(req.params.id);
  await db.delete(theoryRiskAnalysesTable).where(eq(theoryRiskAnalysesTable.id, id));
  res.status(204).send();
});

// ─── Notes & Updates ─────────────────────────────────────────────────────────

router.get("/theories/:theoryId/notes-updates", async (req, res) => {
  const theoryId = Number(req.params.theoryId);
  const rows = await db
    .select()
    .from(theoryNotesUpdatesTable)
    .where(eq(theoryNotesUpdatesTable.theoryId, theoryId))
    .orderBy(theoryNotesUpdatesTable.position, theoryNotesUpdatesTable.id);
  res.json(rows);
});

router.post("/theories/:theoryId/notes-updates", async (req, res) => {
  const theoryId = Number(req.params.theoryId);
  const parsed = insertTheoryNoteUpdateSchema.safeParse({ ...req.body, theoryId });
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues });
    return;
  }
  const [row] = await db.insert(theoryNotesUpdatesTable).values(parsed.data).returning();
  res.status(201).json(row);
});

router.patch("/theories/:theoryId/notes-updates/:id", async (req, res) => {
  const id = Number(req.params.id);
  const theoryId = Number(req.params.theoryId);
  const [row] = await db
    .update(theoryNotesUpdatesTable)
    .set({ ...req.body, updatedAt: new Date() })
    .where(and(eq(theoryNotesUpdatesTable.id, id), eq(theoryNotesUpdatesTable.theoryId, theoryId)))
    .returning();
  if (!row) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json(row);
});

router.delete("/theories/:theoryId/notes-updates/:id", async (req, res) => {
  const id = Number(req.params.id);
  await db.delete(theoryNotesUpdatesTable).where(eq(theoryNotesUpdatesTable.id, id));
  res.status(204).send();
});

// ─── Indicator SC Year Rows ───────────────────────────────────────────────────

router.post("/theories/:theoryId/indicators/:indicatorId/sc-years", async (req, res) => {
  const indicatorId = Number(req.params.indicatorId);
  const parsed = insertIndicatorScYearSchema.safeParse({ ...req.body, indicatorId });
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues });
    return;
  }
  const [row] = await db.insert(indicatorScYearsTable).values(parsed.data).returning();
  res.status(201).json(row);
});

router.patch("/theories/:theoryId/indicators/:indicatorId/sc-years/:id", async (req, res) => {
  const id = Number(req.params.id);
  const indicatorId = Number(req.params.indicatorId);
  const [row] = await db
    .update(indicatorScYearsTable)
    .set({ ...req.body, updatedAt: new Date() })
    .where(and(eq(indicatorScYearsTable.id, id), eq(indicatorScYearsTable.indicatorId, indicatorId)))
    .returning();
  if (!row) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json(row);
});

router.delete("/theories/:theoryId/indicators/:indicatorId/sc-years/:id", async (req, res) => {
  const id = Number(req.params.id);
  await db.delete(indicatorScYearsTable).where(eq(indicatorScYearsTable.id, id));
  res.status(204).send();
});

// ─── Theory Assignments ───────────────────────────────────────────────────────

router.get("/theories/:id/assignments", async (req, res) => {
  const theoryId = Number(req.params.id);
  const assignments = await db
    .select({
      userId: theoryAssignmentsTable.userId,
      username: usersTable.username,
      displayName: usersTable.displayName,
    })
    .from(theoryAssignmentsTable)
    .innerJoin(usersTable, eq(theoryAssignmentsTable.userId, usersTable.id))
    .where(eq(theoryAssignmentsTable.theoryId, theoryId));
  res.json(assignments);
});

router.post("/theories/:id/assignments", requireManager, async (req, res) => {
  const theoryId = Number(req.params.id);
  const { userId } = req.body as { userId?: number };
  if (!userId) {
    res.status(400).json({ error: "userId is required" });
    return;
  }
  const [user] = await db
    .select({ id: usersTable.id })
    .from(usersTable)
    .where(and(eq(usersTable.id, userId), eq(usersTable.orgId, req.session.orgId!)));
  if (!user) {
    res.status(404).json({ error: "User not found in your organisation" });
    return;
  }
  await db
    .insert(theoryAssignmentsTable)
    .values({ theoryId, userId, orgId: req.session.orgId! })
    .onConflictDoNothing();
  res.status(201).json({ theoryId, userId });
});

router.delete("/theories/:id/assignments/:userId", requireManager, async (req, res) => {
  const theoryId = Number(req.params.id);
  const userId = Number(req.params.userId);
  await db
    .delete(theoryAssignmentsTable)
    .where(and(
      eq(theoryAssignmentsTable.theoryId, theoryId),
      eq(theoryAssignmentsTable.userId, userId)
    ));
  res.status(204).send();
});

export default router;
