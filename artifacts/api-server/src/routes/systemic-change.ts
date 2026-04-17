import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { systemicChangesTable, insertSystemicChangeSchema } from "@workspace/db";
import { eq, and } from "drizzle-orm";

const router: IRouter = Router();

router.get("/theories/:theoryId/systemic-changes", async (req, res) => {
  const theoryId = Number(req.params.theoryId);
  const rows = await db
    .select()
    .from(systemicChangesTable)
    .where(eq(systemicChangesTable.theoryId, theoryId))
    .orderBy(systemicChangesTable.position, systemicChangesTable.createdAt);
  res.json(rows);
});

router.post("/theories/:theoryId/systemic-changes", async (req, res) => {
  const theoryId = Number(req.params.theoryId);
  const parsed = insertSystemicChangeSchema.safeParse({ ...req.body, theoryId });
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues });
    return;
  }
  const [row] = await db.insert(systemicChangesTable).values(parsed.data).returning();
  res.status(201).json(row);
});

router.put("/theories/:theoryId/systemic-changes/:id", async (req, res) => {
  const id = Number(req.params.id);
  const theoryId = Number(req.params.theoryId);
  const [row] = await db
    .update(systemicChangesTable)
    .set({ ...req.body, updatedAt: new Date() })
    .where(and(eq(systemicChangesTable.id, id), eq(systemicChangesTable.theoryId, theoryId)))
    .returning();
  if (!row) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json(row);
});

router.delete("/theories/:theoryId/systemic-changes/:id", async (req, res) => {
  const id = Number(req.params.id);
  const theoryId = Number(req.params.theoryId);
  await db
    .delete(systemicChangesTable)
    .where(and(eq(systemicChangesTable.id, id), eq(systemicChangesTable.theoryId, theoryId)));
  res.status(204).send();
});

export default router;
