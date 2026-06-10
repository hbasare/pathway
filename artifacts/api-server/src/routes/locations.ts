import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { theoryLocationsTable, insertTheoryLocationSchema } from "@workspace/db";
import { eq, and } from "drizzle-orm";

const router: IRouter = Router();

router.get("/theories/:theoryId/locations", async (req, res) => {
  const theoryId = Number(req.params.theoryId);
  const rows = await db
    .select()
    .from(theoryLocationsTable)
    .where(eq(theoryLocationsTable.theoryId, theoryId))
    .orderBy(theoryLocationsTable.createdAt);
  res.json(rows);
});

router.post("/theories/:theoryId/locations", async (req, res) => {
  const theoryId = Number(req.params.theoryId);
  const parsed = insertTheoryLocationSchema.safeParse({ ...req.body, theoryId });
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues });
    return;
  }
  const [row] = await db.insert(theoryLocationsTable).values(parsed.data).returning();
  res.status(201).json(row);
});

router.patch("/theories/:theoryId/locations/:id", async (req, res) => {
  const id       = Number(req.params.id);
  const theoryId = Number(req.params.theoryId);
  const allowed  = [
    "icon", "figureLabel", "targetFigure", "actualFigure",
    "lat", "lng", "displayName",
  ] as const;
  const patch: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in req.body) patch[key] = req.body[key];
  }
  patch.updatedAt = new Date();
  const [updated] = await db
    .update(theoryLocationsTable)
    .set(patch)
    .where(and(eq(theoryLocationsTable.id, id), eq(theoryLocationsTable.theoryId, theoryId)))
    .returning();
  if (!updated) { res.status(404).json({ error: "Not found" }); return; }
  res.json(updated);
});

router.delete("/theories/:theoryId/locations/:id", async (req, res) => {
  const id = Number(req.params.id);
  const theoryId = Number(req.params.theoryId);
  await db
    .delete(theoryLocationsTable)
    .where(and(eq(theoryLocationsTable.id, id), eq(theoryLocationsTable.theoryId, theoryId)));
  res.status(204).send();
});

export default router;
