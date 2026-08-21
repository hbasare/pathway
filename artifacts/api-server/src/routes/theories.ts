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
  organizationsTable,
} from "@workspace/db";
import { eq, and, desc, count } from "drizzle-orm";
import { logChange } from "../lib/changelog";
import { changeLogTable } from "@workspace/db";
import { requireManager } from "../middleware/auth";

const router: IRouter = Router();

export async function getAuthorizedTheory(req: any, id: number) {
  const orgId = req.session.orgId;
  const isGlobalAdmin = req.session.role === "system_admin" && !orgId;
  const query = db.select().from(theoriesTable);
  const [theory] = isGlobalAdmin
    ? await query.where(eq(theoriesTable.id, id))
    : await query.where(and(eq(theoriesTable.id, id), eq(theoriesTable.orgId, orgId!)));
  return theory || null;
}

router.get("/theories", async (req, res) => {
  const orgId = req.session.orgId;
  const isGlobalAdmin = req.session.role === "system_admin" && !orgId;

  const query = db.select().from(theoriesTable);
  const theories = isGlobalAdmin
    ? await query.orderBy(theoriesTable.createdAt)
    : await query.where(eq(theoriesTable.orgId, orgId!)).orderBy(theoriesTable.createdAt);
  res.json(theories);
});

router.post("/theories", async (req, res) => {
  const orgId = req.session.orgId;
  if (!orgId) {
    res.status(400).json({ error: "Organization context is required to create an intervention" });
    return;
  }

  // 1. Fetch organization details to get their limit
  const [org] = await db
    .select({ interventionLimit: organizationsTable.interventionLimit })
    .from(organizationsTable)
    .where(eq(organizationsTable.id, orgId))
    .limit(1);

  // 2. Count existing interventions (theories) created by this organization
  const [countResult] = await db
    .select({ count: count() })
    .from(theoriesTable)
    .where(eq(theoriesTable.orgId, orgId));

  const currentCount = countResult?.count ?? 0;

  // 3. Enforce the limit if it is not null
  if (org && org.interventionLimit !== null && currentCount >= org.interventionLimit) {
    res.status(403).json({
      error: `Intervention limit reached. Your organization is restricted to a maximum of ${org.interventionLimit} interventions.`
    });
    return;
  }

  const parsed = insertTheorySchema.safeParse({ ...req.body, orgId });
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues });
    return;
  }
  const [theory] = await db.insert(theoriesTable).values(parsed.data).returning();
  await logChange(req, { theoryId: theory.id, orgId, action: "create", entityType: "theory", entityLabel: theory.title ?? "", summary: `Created intervention "${theory.title ?? ""}"` });
  res.status(201).json(theory);
});


router.get("/theories/:id", async (req, res) => {
  const id = Number(req.params.id);
  const theory = await getAuthorizedTheory(req, id);
  if (!theory) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  const resolvedOrgId = theory.orgId;

  const components = await db.select().from(componentsTable).where(and(eq(componentsTable.theoryId, id), eq(componentsTable.orgId, resolvedOrgId)));
  const connections = await db.select().from(connectionsTable).where(and(eq(connectionsTable.theoryId, id), eq(connectionsTable.orgId, resolvedOrgId)));
  const allIndicators = await db
    .select()
    .from(componentIndicatorsTable)
    .where(and(eq(componentIndicatorsTable.theoryId, id), eq(componentIndicatorsTable.orgId, resolvedOrgId)))
    .orderBy(componentIndicatorsTable.position, componentIndicatorsTable.id);

  const indicatorIds = allIndicators.map(ind => ind.id);
  let allScYears: (typeof indicatorScYearsTable.$inferSelect)[] = [];
  if (indicatorIds.length > 0) {
    const { inArray } = await import("drizzle-orm");
    allScYears = await db
      .select()
      .from(indicatorScYearsTable)
      .where(and(inArray(indicatorScYearsTable.indicatorId, indicatorIds), eq(indicatorScYearsTable.orgId, resolvedOrgId)))
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
  const theory = await getAuthorizedTheory(req, id);
  if (!theory) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  const parsed = insertTheorySchema.safeParse({ ...req.body, orgId: theory.orgId });
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues });
    return;
  }
  const [updated] = await db.update(theoriesTable)
    .set({ ...parsed.data, orgId: theory.orgId, updatedAt: new Date() })
    .where(eq(theoriesTable.id, id))
    .returning();
  if (!updated) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  await logChange(req, { theoryId: updated.id, orgId: theory.orgId, action: "update", entityType: "theory", entityLabel: updated.title ?? "", summary: `Updated intervention "${updated.title ?? ""}"` });
  res.json(updated);
});

router.delete("/theories/:id", async (req, res) => {
  const id = Number(req.params.id);
  const theory = await getAuthorizedTheory(req, id);
  if (!theory) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  await db.delete(theoriesTable).where(eq(theoriesTable.id, id));
  await logChange(req, { theoryId: id, orgId: theory.orgId, action: "delete", entityType: "theory", entityLabel: theory.title ?? "", summary: `Deleted intervention "${theory.title ?? ""}"` });
  res.status(204).send();
});

router.get("/theories/:theoryId/components", async (req, res) => {
  const theoryId = Number(req.params.theoryId);
  const theory = await getAuthorizedTheory(req, theoryId);
  if (!theory) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  const components = await db.select().from(componentsTable).where(and(eq(componentsTable.theoryId, theoryId), eq(componentsTable.orgId, theory.orgId)));
  res.json(components);
});

router.post("/theories/:theoryId/components", async (req, res) => {
  const theoryId = Number(req.params.theoryId);
  const theory = await getAuthorizedTheory(req, theoryId);
  if (!theory) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  const parsed = insertComponentSchema.safeParse({ ...req.body, theoryId, orgId: theory.orgId });
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues });
    return;
  }
  const [component] = await db.insert(componentsTable).values(parsed.data).returning();
  await logChange(req, { theoryId, orgId: theory.orgId, action: "create", entityType: "component", entityLabel: component.title ?? "", summary: `Created component "${component.title ?? ""}"` });
  res.status(201).json(component);
});

router.put("/theories/:theoryId/components/:id", async (req, res) => {
  const id = Number(req.params.id);
  const theoryId = Number(req.params.theoryId);
  const theory = await getAuthorizedTheory(req, theoryId);
  if (!theory) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  const parsed = insertComponentSchema.safeParse({ ...req.body, theoryId, orgId: theory.orgId });
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues });
    return;
  }
  const [updated] = await db.update(componentsTable)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(and(eq(componentsTable.id, id), eq(componentsTable.orgId, theory.orgId)))
    .returning();
  if (!updated) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  await logChange(req, { theoryId, orgId: theory.orgId, action: "update", entityType: "component", entityLabel: updated.title ?? "", summary: `Updated component "${updated.title ?? ""}"` });
  res.json(updated);
});

router.delete("/theories/:theoryId/components/:id", async (req, res) => {
  const id = Number(req.params.id);
  const theoryId = Number(req.params.theoryId);
  const theory = await getAuthorizedTheory(req, theoryId);
  if (!theory) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  const [component] = await db.select().from(componentsTable).where(and(eq(componentsTable.id, id), eq(componentsTable.orgId, theory.orgId)));
  await db.delete(componentsTable).where(and(eq(componentsTable.id, id), eq(componentsTable.orgId, theory.orgId)));
  if (component) {
    await logChange(req, { theoryId, orgId: theory.orgId, action: "delete", entityType: "component", entityLabel: component.title ?? "", summary: `Deleted component "${component.title ?? ""}"` });
  }
  res.status(204).send();
});

// Component Indicators CRUD
router.get("/theories/:theoryId/components/:componentId/indicators", async (req, res) => {
  const componentId = Number(req.params.componentId);
  const theoryId = Number(req.params.theoryId);
  const theory = await getAuthorizedTheory(req, theoryId);
  if (!theory) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  const indicators = await db
    .select()
    .from(componentIndicatorsTable)
    .where(and(
      eq(componentIndicatorsTable.componentId, componentId),
      eq(componentIndicatorsTable.theoryId, theoryId),
      eq(componentIndicatorsTable.orgId, theory.orgId)
    ))
    .orderBy(componentIndicatorsTable.position, componentIndicatorsTable.id);
  res.json(indicators);
});

router.post("/theories/:theoryId/components/:componentId/indicators", async (req, res) => {
  const componentId = Number(req.params.componentId);
  const theoryId = Number(req.params.theoryId);
  const theory = await getAuthorizedTheory(req, theoryId);
  if (!theory) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  const parsed = insertComponentIndicatorSchema.safeParse({ ...req.body, componentId, theoryId, orgId: theory.orgId });
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues });
    return;
  }
  const [indicator] = await db.insert(componentIndicatorsTable).values(parsed.data).returning();
  await logChange(req, { theoryId, orgId: theory.orgId, action: "create", entityType: "indicator", entityLabel: indicator.name ?? "", summary: `Created indicator "${indicator.name ?? ""}"` });
  res.status(201).json(indicator);
});

router.put("/theories/:theoryId/components/:componentId/indicators/:id", async (req, res) => {
  const id = Number(req.params.id);
  const componentId = Number(req.params.componentId);
  const theoryId = Number(req.params.theoryId);
  const theory = await getAuthorizedTheory(req, theoryId);
  if (!theory) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  const parsed = insertComponentIndicatorSchema.safeParse({ ...req.body, componentId, theoryId, orgId: theory.orgId });
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues });
    return;
  }
  const [updated] = await db.update(componentIndicatorsTable)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(and(eq(componentIndicatorsTable.id, id), eq(componentIndicatorsTable.orgId, theory.orgId)))
    .returning();
  if (!updated) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  await logChange(req, { theoryId, orgId: theory.orgId, action: "update", entityType: "indicator", entityLabel: updated.name ?? "", summary: `Updated indicator "${updated.name ?? ""}"` });
  res.json(updated);
});

router.delete("/theories/:theoryId/components/:componentId/indicators/:id", async (req, res) => {
  const id = Number(req.params.id);
  const theoryId = Number(req.params.theoryId);
  const theory = await getAuthorizedTheory(req, theoryId);
  if (!theory) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  const [indicator] = await db.select().from(componentIndicatorsTable).where(and(eq(componentIndicatorsTable.id, id), eq(componentIndicatorsTable.orgId, theory.orgId)));
  await db.delete(componentIndicatorsTable).where(and(eq(componentIndicatorsTable.id, id), eq(componentIndicatorsTable.orgId, theory.orgId)));
  if (indicator) {
    await logChange(req, { theoryId, orgId: theory.orgId, action: "delete", entityType: "indicator", entityLabel: indicator.name ?? "", summary: `Deleted indicator "${indicator.name ?? ""}"` });
  }
  res.status(204).send();
});

router.get("/theories/:theoryId/connections", async (req, res) => {
  const theoryId = Number(req.params.theoryId);
  const theory = await getAuthorizedTheory(req, theoryId);
  if (!theory) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  const connections = await db.select().from(connectionsTable).where(and(eq(connectionsTable.theoryId, theoryId), eq(connectionsTable.orgId, theory.orgId)));
  res.json(connections);
});

router.post("/theories/:theoryId/connections", async (req, res) => {
  const theoryId = Number(req.params.theoryId);
  const theory = await getAuthorizedTheory(req, theoryId);
  if (!theory) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  const parsed = insertConnectionSchema.safeParse({ ...req.body, theoryId, orgId: theory.orgId });
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues });
    return;
  }
  const [connection] = await db.insert(connectionsTable).values(parsed.data).returning();
  await logChange(req, { theoryId, orgId: theory.orgId, action: "create", entityType: "connection", summary: "Created a new connection" });
  res.status(201).json(connection);
});

router.patch("/theories/:theoryId/connections/:id", async (req, res) => {
  const theoryId = Number(req.params.theoryId);
  const id = Number(req.params.id);
  const theory = await getAuthorizedTheory(req, theoryId);
  if (!theory) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  const { startAnchor, endAnchor } = req.body;
  await db
    .update(connectionsTable)
    .set({ startAnchor: startAnchor ?? null, endAnchor: endAnchor ?? null })
    .where(and(eq(connectionsTable.id, id), eq(connectionsTable.theoryId, theoryId), eq(connectionsTable.orgId, theory.orgId)));
  const [updated] = await db
    .select()
    .from(connectionsTable)
    .where(and(eq(connectionsTable.id, id), eq(connectionsTable.theoryId, theoryId), eq(connectionsTable.orgId, theory.orgId)));
  await logChange(req, { theoryId, orgId: theory.orgId, action: "update", entityType: "connection", summary: "Updated a connection" });
  res.json(updated);
});

router.delete("/theories/:theoryId/connections/:id", async (req, res) => {
  const id = Number(req.params.id);
  const theoryId = Number(req.params.theoryId);
  const theory = await getAuthorizedTheory(req, theoryId);
  if (!theory) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  await db.delete(connectionsTable).where(and(eq(connectionsTable.id, id), eq(connectionsTable.orgId, theory.orgId)));
  await logChange(req, { theoryId, orgId: theory.orgId, action: "delete", entityType: "connection", summary: "Deleted a connection" });
  res.status(204).send();
});

// ─── Risk Analyses ───────────────────────────────────────────────────────────
router.get("/theories/:theoryId/risk-analyses", async (req, res) => {
  const theoryId = Number(req.params.theoryId);
  const theory = await getAuthorizedTheory(req, theoryId);
  if (!theory) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  const rows = await db
    .select()
    .from(theoryRiskAnalysesTable)
    .where(and(eq(theoryRiskAnalysesTable.theoryId, theoryId), eq(theoryRiskAnalysesTable.orgId, theory.orgId)))
    .orderBy(theoryRiskAnalysesTable.position, theoryRiskAnalysesTable.id);
  res.json(rows);
});

router.post("/theories/:theoryId/risk-analyses", async (req, res) => {
  const theoryId = Number(req.params.theoryId);
  const theory = await getAuthorizedTheory(req, theoryId);
  if (!theory) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  const parsed = insertTheoryRiskAnalysisSchema.safeParse({ ...req.body, theoryId, orgId: theory.orgId });
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues });
    return;
  }
  const [row] = await db.insert(theoryRiskAnalysesTable).values(parsed.data).returning();
  await logChange(req, { theoryId, orgId: theory.orgId, action: "create", entityType: "risk", entityLabel: row.risk ?? "", summary: "Created a risk analysis entry" });
  res.status(201).json(row);
});

router.patch("/theories/:theoryId/risk-analyses/:id", async (req, res) => {
  const id = Number(req.params.id);
  const theoryId = Number(req.params.theoryId);
  const theory = await getAuthorizedTheory(req, theoryId);
  if (!theory) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  const [row] = await db
    .update(theoryRiskAnalysesTable)
    .set({ ...req.body, updatedAt: new Date() })
    .where(and(eq(theoryRiskAnalysesTable.id, id), eq(theoryRiskAnalysesTable.theoryId, theoryId), eq(theoryRiskAnalysesTable.orgId, theory.orgId)))
    .returning();
  if (!row) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  await logChange(req, { theoryId, orgId: theory.orgId, action: "update", entityType: "risk", entityLabel: row.risk ?? "", summary: "Updated a risk analysis entry" });
  res.json(row);
});

router.delete("/theories/:theoryId/risk-analyses/:id", async (req, res) => {
  const id = Number(req.params.id);
  const theoryId = Number(req.params.theoryId);
  const theory = await getAuthorizedTheory(req, theoryId);
  if (!theory) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  const [row] = await db.select().from(theoryRiskAnalysesTable).where(and(eq(theoryRiskAnalysesTable.id, id), eq(theoryRiskAnalysesTable.orgId, theory.orgId)));
  await db.delete(theoryRiskAnalysesTable).where(and(eq(theoryRiskAnalysesTable.id, id), eq(theoryRiskAnalysesTable.orgId, theory.orgId)));
  if (row) {
    await logChange(req, { theoryId, orgId: theory.orgId, action: "delete", entityType: "risk", entityLabel: row.risk ?? "", summary: "Deleted a risk analysis entry" });
  }
  res.status(204).send();
});

// ─── Notes & Updates ─────────────────────────────────────────────────────────
router.get("/theories/:theoryId/notes-updates", async (req, res) => {
  const theoryId = Number(req.params.theoryId);
  const theory = await getAuthorizedTheory(req, theoryId);
  if (!theory) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  const rows = await db
    .select()
    .from(theoryNotesUpdatesTable)
    .where(and(eq(theoryNotesUpdatesTable.theoryId, theoryId), eq(theoryNotesUpdatesTable.orgId, theory.orgId)))
    .orderBy(theoryNotesUpdatesTable.position, theoryNotesUpdatesTable.id);
  res.json(rows);
});

router.post("/theories/:theoryId/notes-updates", async (req, res) => {
  const theoryId = Number(req.params.theoryId);
  const theory = await getAuthorizedTheory(req, theoryId);
  if (!theory) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  const parsed = insertTheoryNoteUpdateSchema.safeParse({ ...req.body, theoryId, orgId: theory.orgId });
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues });
    return;
  }
  const [row] = await db.insert(theoryNotesUpdatesTable).values(parsed.data).returning();
  await logChange(req, { theoryId, orgId: theory.orgId, action: "create", entityType: "note", summary: "Added a note/update" });
  res.status(201).json(row);
});

router.patch("/theories/:theoryId/notes-updates/:id", async (req, res) => {
  const id = Number(req.params.id);
  const theoryId = Number(req.params.theoryId);
  const theory = await getAuthorizedTheory(req, theoryId);
  if (!theory) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  const [row] = await db
    .update(theoryNotesUpdatesTable)
    .set({ ...req.body, updatedAt: new Date() })
    .where(and(eq(theoryNotesUpdatesTable.id, id), eq(theoryNotesUpdatesTable.theoryId, theoryId), eq(theoryNotesUpdatesTable.orgId, theory.orgId)))
    .returning();
  if (!row) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  await logChange(req, { theoryId, orgId: theory.orgId, action: "update", entityType: "note", summary: "Updated a note/update" });
  res.json(row);
});

router.delete("/theories/:theoryId/notes-updates/:id", async (req, res) => {
  const id = Number(req.params.id);
  const theoryId = Number(req.params.theoryId);
  const theory = await getAuthorizedTheory(req, theoryId);
  if (!theory) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  await db.delete(theoryNotesUpdatesTable).where(and(eq(theoryNotesUpdatesTable.id, id), eq(theoryNotesUpdatesTable.orgId, theory.orgId)));
  await logChange(req, { theoryId, orgId: theory.orgId, action: "delete", entityType: "note", summary: "Deleted a note/update" });
  res.status(204).send();
});

// ─── Indicator SC Year Rows ───────────────────────────────────────────────────
router.post("/theories/:theoryId/indicators/:indicatorId/sc-years", async (req, res) => {
  const theoryId = Number(req.params.theoryId);
  const indicatorId = Number(req.params.indicatorId);
  const theory = await getAuthorizedTheory(req, theoryId);
  if (!theory) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  const parsed = insertIndicatorScYearSchema.safeParse({ ...req.body, indicatorId, orgId: theory.orgId });
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues });
    return;
  }
  const [row] = await db.insert(indicatorScYearsTable).values(parsed.data).returning();
  res.status(201).json(row);
});

router.patch("/theories/:theoryId/indicators/:indicatorId/sc-years/:id", async (req, res) => {
  const id = Number(req.params.id);
  const theoryId = Number(req.params.theoryId);
  const indicatorId = Number(req.params.indicatorId);
  const theory = await getAuthorizedTheory(req, theoryId);
  if (!theory) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  const [row] = await db
    .update(indicatorScYearsTable)
    .set({ ...req.body, updatedAt: new Date() })
    .where(and(eq(indicatorScYearsTable.id, id), eq(indicatorScYearsTable.indicatorId, indicatorId), eq(indicatorScYearsTable.orgId, theory.orgId)))
    .returning();
  if (!row) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json(row);
});

router.delete("/theories/:theoryId/indicators/:indicatorId/sc-years/:id", async (req, res) => {
  const id = Number(req.params.id);
  const theoryId = Number(req.params.theoryId);
  const theory = await getAuthorizedTheory(req, theoryId);
  if (!theory) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  await db.delete(indicatorScYearsTable).where(and(eq(indicatorScYearsTable.id, id), eq(indicatorScYearsTable.orgId, theory.orgId)));
  res.status(204).send();
});

// ─── Theory Assignments ───────────────────────────────────────────────────────
router.get("/theories/:id/assignments", async (req, res) => {
  const theoryId = Number(req.params.id);
  const theory = await getAuthorizedTheory(req, theoryId);
  if (!theory) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  const assignments = await db
    .select({
      userId: theoryAssignmentsTable.userId,
      username: usersTable.username,
      displayName: usersTable.displayName,
    })
    .from(theoryAssignmentsTable)
    .innerJoin(usersTable, eq(theoryAssignmentsTable.userId, usersTable.id))
    .where(and(eq(theoryAssignmentsTable.theoryId, theoryId), eq(theoryAssignmentsTable.orgId, theory.orgId)));
  res.json(assignments);
});

router.post("/theories/:id/assignments", requireManager, async (req, res) => {
  const theoryId = Number(req.params.id);
  const theory = await getAuthorizedTheory(req, theoryId);
  if (!theory) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  const { userId } = req.body as { userId?: number };
  if (!userId) {
    res.status(400).json({ error: "userId is required" });
    return;
  }
  const [user] = await db
    .select({ id: usersTable.id })
    .from(usersTable)
    .where(and(eq(usersTable.id, userId), eq(usersTable.orgId, theory.orgId)));
  if (!user) {
    res.status(404).json({ error: "User not found in your organisation" });
    return;
  }
  await db
    .insert(theoryAssignmentsTable)
    .values({ theoryId, userId, orgId: theory.orgId })
    .onConflictDoNothing();
  res.status(201).json({ theoryId, userId });
});

router.delete("/theories/:id/assignments/:userId", requireManager, async (req, res) => {
  const theoryId = Number(req.params.id);
  const userId = Number(req.params.userId);
  const theory = await getAuthorizedTheory(req, theoryId);
  if (!theory) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  await db
    .delete(theoryAssignmentsTable)
    .where(and(
      eq(theoryAssignmentsTable.theoryId, theoryId),
      eq(theoryAssignmentsTable.userId, userId),
      eq(theoryAssignmentsTable.orgId, theory.orgId)
    ));
  res.status(204).send();
});

// ─── Change Log ───────────────────────────────────────────────────────────────
router.get("/theories/:theoryId/change-log", async (req, res) => {
  const theoryId = Number(req.params.theoryId);
  const theory = await getAuthorizedTheory(req, theoryId);
  if (!theory) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  const rows = await db
    .select()
    .from(changeLogTable)
    .where(and(eq(changeLogTable.theoryId, theoryId), eq(changeLogTable.orgId, theory.orgId)))
    .orderBy(desc(changeLogTable.createdAt));
  res.json(rows);
});

export default router;
