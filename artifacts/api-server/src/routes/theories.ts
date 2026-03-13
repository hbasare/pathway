import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { theoriesTable, componentsTable, connectionsTable, insertTheorySchema, insertComponentSchema, insertConnectionSchema } from "@workspace/db";
import { eq } from "drizzle-orm";

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
  res.json({ ...theory, components, connections });
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

export default router;
