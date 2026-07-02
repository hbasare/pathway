import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { theoryLocationsTable, insertTheoryLocationSchema } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { logChange } from "../lib/changelog";

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
  await logChange(req, { theoryId, action: "create", entityType: "location", entityLabel: row.displayName ?? "", summary: `Added location "${row.displayName ?? ""}"` });
  res.status(201).json(row);
});

router.patch("/theories/:theoryId/locations/:id", async (req, res) => {
  const id       = Number(req.params.id);
  const theoryId = Number(req.params.theoryId);
  const allowed  = [
    "icon", "figureLabel", "targetFigure", "actualFigure",
    "lat", "lng", "displayName", "community",
    "sector", "activityType", "activityDate", "activityOther", "activityCommodity",
    "beneficiaryType", "numBeneficiaries", "numMale", "numFemale",
    "gender", "youthFocused", "implementingPartner", "fundingSource", "notes",
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
  await logChange(req, { theoryId, action: "update", entityType: "location", entityLabel: updated.displayName ?? "", summary: `Updated location "${updated.displayName ?? ""}"` });
  res.json(updated);
});

router.delete("/theories/:theoryId/locations/:id", async (req, res) => {
  const id = Number(req.params.id);
  const theoryId = Number(req.params.theoryId);
  const [row] = await db.select().from(theoryLocationsTable).where(and(eq(theoryLocationsTable.id, id), eq(theoryLocationsTable.theoryId, theoryId)));
  await db
    .delete(theoryLocationsTable)
    .where(and(eq(theoryLocationsTable.id, id), eq(theoryLocationsTable.theoryId, theoryId)));
  if (row) {
    await logChange(req, { theoryId, action: "delete", entityType: "location", entityLabel: row.displayName ?? "", summary: `Deleted location "${row.displayName ?? ""}"` });
  }
  res.status(204).send();
});

export default router;
