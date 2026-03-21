import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import {
  theoriesTable,
  componentsTable,
  connectionsTable,
  componentIndicatorsTable,
  theoryNotesUpdatesTable,
  insertTheorySchema,
  insertComponentSchema,
  insertConnectionSchema,
  insertComponentIndicatorSchema,
  insertTheoryNoteUpdateSchema,
} from "@workspace/db";
import { eq, and } from "drizzle-orm";

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

  const componentsWithIndicators = components.map(c => ({
    ...c,
    componentIndicators: allIndicators.filter(ind => ind.componentId === c.id),
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

router.delete("/theories/:theoryId/connections/:id", async (req, res) => {
  const id = Number(req.params.id);
  await db.delete(connectionsTable).where(eq(connectionsTable.id, id));
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

export default router;
