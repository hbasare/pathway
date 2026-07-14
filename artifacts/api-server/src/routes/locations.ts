import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { theoriesTable, theoryLocationsTable, insertTheoryLocationSchema } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { logChange } from "../lib/changelog";

const router: IRouter = Router();

async function getAuthorizedTheory(req: any, id: number) {
  const orgId = req.session.orgId;
  const isGlobalAdmin = req.session.role === "system_admin" && !orgId;
  const query = db.select().from(theoriesTable);
  const [theory] = isGlobalAdmin
    ? await query.where(eq(theoriesTable.id, id))
    : await query.where(and(eq(theoriesTable.id, id), eq(theoriesTable.orgId, orgId!)));
  return theory || null;
}

router.get("/theories/:theoryId/locations", async (req, res) => {
  const theoryId = Number(req.params.theoryId);
  const theory = await getAuthorizedTheory(req, theoryId);
  if (!theory) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  const rows = await db
    .select()
    .from(theoryLocationsTable)
    .where(and(eq(theoryLocationsTable.theoryId, theoryId), eq(theoryLocationsTable.orgId, theory.orgId)))
    .orderBy(theoryLocationsTable.createdAt);
  res.json(rows);
});

router.post("/theories/:theoryId/locations", async (req, res) => {
  const theoryId = Number(req.params.theoryId);
  const theory = await getAuthorizedTheory(req, theoryId);
  if (!theory) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  const parsed = insertTheoryLocationSchema.safeParse({ ...req.body, theoryId, orgId: theory.orgId });
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues });
    return;
  }
  const [row] = await db.insert(theoryLocationsTable).values(parsed.data).returning();
  await logChange(req, { theoryId, orgId: theory.orgId, action: "create", entityType: "location", entityLabel: row.displayName ?? "", summary: `Added location "${row.displayName ?? ""}"` });
  res.status(201).json(row);
});

router.patch("/theories/:theoryId/locations/:id", async (req, res) => {
  const id       = Number(req.params.id);
  const theoryId = Number(req.params.theoryId);
  const theory = await getAuthorizedTheory(req, theoryId);
  if (!theory) {
    res.status(404).json({ error: "Not found" });
    return;
  }
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
    .where(and(eq(theoryLocationsTable.id, id), eq(theoryLocationsTable.theoryId, theoryId), eq(theoryLocationsTable.orgId, theory.orgId)))
    .returning();
  if (!updated) { res.status(404).json({ error: "Not found" }); return; }
  await logChange(req, { theoryId, orgId: theory.orgId, action: "update", entityType: "location", entityLabel: updated.displayName ?? "", summary: `Updated location "${updated.displayName ?? ""}"` });
  res.json(updated);
});

router.delete("/theories/:theoryId/locations/:id", async (req, res) => {
  const id = Number(req.params.id);
  const theoryId = Number(req.params.theoryId);
  const theory = await getAuthorizedTheory(req, theoryId);
  if (!theory) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  const [row] = await db.select().from(theoryLocationsTable).where(and(eq(theoryLocationsTable.id, id), eq(theoryLocationsTable.theoryId, theoryId), eq(theoryLocationsTable.orgId, theory.orgId)));
  await db
    .delete(theoryLocationsTable)
    .where(and(eq(theoryLocationsTable.id, id), eq(theoryLocationsTable.theoryId, theoryId), eq(theoryLocationsTable.orgId, theory.orgId)));
  if (row) {
    await logChange(req, { theoryId, orgId: theory.orgId, action: "delete", entityType: "location", entityLabel: row.displayName ?? "", summary: `Deleted location "${row.displayName ?? ""}"` });
  }
  res.status(204).send();
});

export default router;
