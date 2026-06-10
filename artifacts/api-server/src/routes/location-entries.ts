import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { theoryLocationEntriesTable, insertTheoryLocationEntrySchema } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";

const router: IRouter = Router();

router.get("/theories/:theoryId/locations/:locationId/entries", async (req, res) => {
  const locationId = Number(req.params.locationId);
  const theoryId   = Number(req.params.theoryId);
  const rows = await db
    .select()
    .from(theoryLocationEntriesTable)
    .where(and(eq(theoryLocationEntriesTable.locationId, locationId), eq(theoryLocationEntriesTable.theoryId, theoryId)))
    .orderBy(desc(theoryLocationEntriesTable.activityDate), desc(theoryLocationEntriesTable.createdAt));
  res.json(rows);
});

router.post("/theories/:theoryId/locations/:locationId/entries", async (req, res) => {
  const locationId = Number(req.params.locationId);
  const theoryId   = Number(req.params.theoryId);
  const parsed = insertTheoryLocationEntrySchema.safeParse({ ...req.body, locationId, theoryId });
  if (!parsed.success) { res.status(400).json({ error: parsed.error.issues }); return; }
  const [row] = await db.insert(theoryLocationEntriesTable).values(parsed.data).returning();
  res.status(201).json(row);
});

router.patch("/theories/:theoryId/locations/:locationId/entries/:id", async (req, res) => {
  const id         = Number(req.params.id);
  const locationId = Number(req.params.locationId);
  const theoryId   = Number(req.params.theoryId);
  const allowed = [
    "activityDate", "activityType", "activityOther", "activityCommodity",
    "beneficiaryType", "numBeneficiaries", "numMale", "numFemale",
    "gender", "implementingPartner", "fundingSource",
    "targetFigure", "actualFigure", "notes",
  ] as const;
  const patch: Record<string, unknown> = {};
  for (const key of allowed) { if (key in req.body) patch[key] = req.body[key]; }
  patch.updatedAt = new Date();
  const [updated] = await db
    .update(theoryLocationEntriesTable)
    .set(patch)
    .where(and(
      eq(theoryLocationEntriesTable.id, id),
      eq(theoryLocationEntriesTable.locationId, locationId),
      eq(theoryLocationEntriesTable.theoryId, theoryId),
    ))
    .returning();
  if (!updated) { res.status(404).json({ error: "Not found" }); return; }
  res.json(updated);
});

router.delete("/theories/:theoryId/locations/:locationId/entries/:id", async (req, res) => {
  const id         = Number(req.params.id);
  const locationId = Number(req.params.locationId);
  const theoryId   = Number(req.params.theoryId);
  await db
    .delete(theoryLocationEntriesTable)
    .where(and(
      eq(theoryLocationEntriesTable.id, id),
      eq(theoryLocationEntriesTable.locationId, locationId),
      eq(theoryLocationEntriesTable.theoryId, theoryId),
    ));
  res.status(204).send();
});

export default router;
