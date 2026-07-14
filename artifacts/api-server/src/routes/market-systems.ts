import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import {
  theoriesTable,
  marketSystemsTable, insertMarketSystemSchema,
  marketSystemElementsTable, insertMarketSystemElementSchema,
} from "@workspace/db";
import { eq, and, asc } from "drizzle-orm";
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

// ── Market Systems ────────────────────────────────────────────────────────────
router.get("/theories/:theoryId/market-systems", async (req, res) => {
  const theoryId = Number(req.params.theoryId);
  const theory = await getAuthorizedTheory(req, theoryId);
  if (!theory) { res.status(404).json({ error: "Not found" }); return; }
  const rows = await db.select().from(marketSystemsTable)
    .where(and(eq(marketSystemsTable.theoryId, theoryId), eq(marketSystemsTable.orgId, theory.orgId)))
    .orderBy(asc(marketSystemsTable.position), asc(marketSystemsTable.createdAt));
  res.json(rows);
});

router.post("/theories/:theoryId/market-systems", async (req, res) => {
  const theoryId = Number(req.params.theoryId);
  const theory = await getAuthorizedTheory(req, theoryId);
  if (!theory) { res.status(404).json({ error: "Not found" }); return; }
  const parsed = insertMarketSystemSchema.safeParse({ ...req.body, theoryId, orgId: theory.orgId });
  if (!parsed.success) { res.status(400).json({ error: parsed.error.issues }); return; }
  const [row] = await db.insert(marketSystemsTable).values(parsed.data).returning();
  await logChange(req, { theoryId, orgId: theory.orgId, action: "create", entityType: "market_system", entityLabel: row.title ?? "", summary: `Created market system "${row.title ?? ""}"` });
  res.status(201).json(row);
});

router.patch("/theories/:theoryId/market-systems/:id", async (req, res) => {
  const id = Number(req.params.id);
  const theoryId = Number(req.params.theoryId);
  const theory = await getAuthorizedTheory(req, theoryId);
  if (!theory) { res.status(404).json({ error: "Not found" }); return; }
  const allowed = ["title","description","marketFocus","color","position"] as const;
  const patch: Record<string, unknown> = { updatedAt: new Date() };
  for (const k of allowed) { if (k in req.body) patch[k] = req.body[k]; }
  const [row] = await db.update(marketSystemsTable).set(patch)
    .where(and(eq(marketSystemsTable.id, id), eq(marketSystemsTable.theoryId, theoryId), eq(marketSystemsTable.orgId, theory.orgId)))
    .returning();
  if (!row) { res.status(404).json({ error: "Not found" }); return; }
  await logChange(req, { theoryId, orgId: theory.orgId, action: "update", entityType: "market_system", entityLabel: row.title ?? "", summary: `Updated market system "${row.title ?? ""}"` });
  res.json(row);
});

router.delete("/theories/:theoryId/market-systems/:id", async (req, res) => {
  const id = Number(req.params.id);
  const theoryId = Number(req.params.theoryId);
  const theory = await getAuthorizedTheory(req, theoryId);
  if (!theory) { res.status(404).json({ error: "Not found" }); return; }
  const [row] = await db.select().from(marketSystemsTable)
    .where(and(eq(marketSystemsTable.id, id), eq(marketSystemsTable.theoryId, theoryId), eq(marketSystemsTable.orgId, theory.orgId)));
  await db.delete(marketSystemsTable)
    .where(and(eq(marketSystemsTable.id, id), eq(marketSystemsTable.theoryId, theoryId), eq(marketSystemsTable.orgId, theory.orgId)));
  if (row) {
    await logChange(req, { theoryId, orgId: theory.orgId, action: "delete", entityType: "market_system", entityLabel: row.title ?? "", summary: `Deleted market system "${row.title ?? ""}"` });
  }
  res.status(204).send();
});

// ── Market System Elements ────────────────────────────────────────────────────
router.get("/theories/:theoryId/market-systems/:marketId/elements", async (req, res) => {
  const marketId = Number(req.params.marketId);
  const theoryId = Number(req.params.theoryId);
  const theory = await getAuthorizedTheory(req, theoryId);
  if (!theory) { res.status(404).json({ error: "Not found" }); return; }
  const rows = await db.select().from(marketSystemElementsTable)
    .where(and(
      eq(marketSystemElementsTable.marketSystemId, marketId),
      eq(marketSystemElementsTable.theoryId, theoryId),
      eq(marketSystemElementsTable.orgId, theory.orgId)
    ))
    .orderBy(asc(marketSystemElementsTable.ring), asc(marketSystemElementsTable.position), asc(marketSystemElementsTable.createdAt));
  res.json(rows);
});

router.post("/theories/:theoryId/market-systems/:marketId/elements", async (req, res) => {
  const marketId = Number(req.params.marketId);
  const theoryId = Number(req.params.theoryId);
  const theory = await getAuthorizedTheory(req, theoryId);
  if (!theory) { res.status(404).json({ error: "Not found" }); return; }
  const parsed = insertMarketSystemElementSchema.safeParse({ ...req.body, marketSystemId: marketId, theoryId, orgId: theory.orgId });
  if (!parsed.success) { res.status(400).json({ error: parsed.error.issues }); return; }
  const [row] = await db.insert(marketSystemElementsTable).values(parsed.data).returning();
  await logChange(req, { theoryId, orgId: theory.orgId, action: "create", entityType: "market_system_element", entityLabel: row.title ?? "", summary: `Added market system element "${row.title ?? ""}"` });
  res.status(201).json(row);
});

router.patch("/theories/:theoryId/market-systems/:marketId/elements/:id", async (req, res) => {
  const id = Number(req.params.id);
  const marketId = Number(req.params.marketId);
  const theoryId = Number(req.params.theoryId);
  const theory = await getAuthorizedTheory(req, theoryId);
  if (!theory) { res.status(404).json({ error: "Not found" }); return; }
  const allowed = ["ring","category","title","description","actors","constraints","opportunities","color","position","linkedMarketSystemId"] as const;
  const patch: Record<string, unknown> = { updatedAt: new Date() };
  for (const k of allowed) { if (k in req.body) patch[k] = req.body[k]; }
  const [row] = await db.update(marketSystemElementsTable).set(patch)
    .where(and(
      eq(marketSystemElementsTable.id, id),
      eq(marketSystemElementsTable.marketSystemId, marketId),
      eq(marketSystemElementsTable.theoryId, theoryId),
      eq(marketSystemElementsTable.orgId, theory.orgId),
    ))
    .returning();
  if (!row) { res.status(404).json({ error: "Not found" }); return; }
  await logChange(req, { theoryId, orgId: theory.orgId, action: "update", entityType: "market_system_element", entityLabel: row.title ?? "", summary: `Updated market system element "${row.title ?? ""}"` });
  res.json(row);
});

router.delete("/theories/:theoryId/market-systems/:marketId/elements/:id", async (req, res) => {
  const id = Number(req.params.id);
  const marketId = Number(req.params.marketId);
  const theoryId = Number(req.params.theoryId);
  const theory = await getAuthorizedTheory(req, theoryId);
  if (!theory) { res.status(404).json({ error: "Not found" }); return; }
  const [row] = await db.select().from(marketSystemElementsTable)
    .where(and(
      eq(marketSystemElementsTable.id, id),
      eq(marketSystemElementsTable.marketSystemId, marketId),
      eq(marketSystemElementsTable.theoryId, theoryId),
      eq(marketSystemElementsTable.orgId, theory.orgId)
    ));
  await db.delete(marketSystemElementsTable)
    .where(and(
      eq(marketSystemElementsTable.id, id),
      eq(marketSystemElementsTable.marketSystemId, marketId),
      eq(marketSystemElementsTable.theoryId, theoryId),
      eq(marketSystemElementsTable.orgId, theory.orgId)
    ));
  if (row) {
    await logChange(req, { theoryId, orgId: theory.orgId, action: "delete", entityType: "market_system_element", entityLabel: row.title ?? "", summary: `Deleted market system element "${row.title ?? ""}"` });
  }
  res.status(204).send();
});

export default router;
