import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import {
  marketSystemsTable, insertMarketSystemSchema,
  marketSystemElementsTable, insertMarketSystemElementSchema,
} from "@workspace/db";
import { eq, and, asc } from "drizzle-orm";
import { logChange } from "../lib/changelog";

const router: IRouter = Router();

// ── Market Systems ────────────────────────────────────────────────────────────
router.get("/theories/:theoryId/market-systems", async (req, res) => {
  const theoryId = Number(req.params.theoryId);
  const rows = await db.select().from(marketSystemsTable)
    .where(eq(marketSystemsTable.theoryId, theoryId))
    .orderBy(asc(marketSystemsTable.position), asc(marketSystemsTable.createdAt));
  res.json(rows);
});

router.post("/theories/:theoryId/market-systems", async (req, res) => {
  const theoryId = Number(req.params.theoryId);
  const parsed = insertMarketSystemSchema.safeParse({ ...req.body, theoryId });
  if (!parsed.success) { res.status(400).json({ error: parsed.error.issues }); return; }
  const [row] = await db.insert(marketSystemsTable).values(parsed.data).returning();
  await logChange(req, { theoryId, action: "create", entityType: "market_system", entityLabel: row.title ?? "", summary: `Created market system "${row.title ?? ""}"` });
  res.status(201).json(row);
});

router.patch("/theories/:theoryId/market-systems/:id", async (req, res) => {
  const id = Number(req.params.id);
  const theoryId = Number(req.params.theoryId);
  const allowed = ["title","description","marketFocus","color","position"] as const;
  const patch: Record<string, unknown> = { updatedAt: new Date() };
  for (const k of allowed) { if (k in req.body) patch[k] = req.body[k]; }
  const [row] = await db.update(marketSystemsTable).set(patch)
    .where(and(eq(marketSystemsTable.id, id), eq(marketSystemsTable.theoryId, theoryId)))
    .returning();
  if (!row) { res.status(404).json({ error: "Not found" }); return; }
  await logChange(req, { theoryId, action: "update", entityType: "market_system", entityLabel: row.title ?? "", summary: `Updated market system "${row.title ?? ""}"` });
  res.json(row);
});

router.delete("/theories/:theoryId/market-systems/:id", async (req, res) => {
  const id = Number(req.params.id);
  const theoryId = Number(req.params.theoryId);
  const [row] = await db.select().from(marketSystemsTable)
    .where(and(eq(marketSystemsTable.id, id), eq(marketSystemsTable.theoryId, theoryId)));
  await db.delete(marketSystemsTable)
    .where(and(eq(marketSystemsTable.id, id), eq(marketSystemsTable.theoryId, theoryId)));
  if (row) {
    await logChange(req, { theoryId, action: "delete", entityType: "market_system", entityLabel: row.title ?? "", summary: `Deleted market system "${row.title ?? ""}"` });
  }
  res.status(204).send();
});

// ── Market System Elements ────────────────────────────────────────────────────
router.get("/theories/:theoryId/market-systems/:marketId/elements", async (req, res) => {
  const marketId = Number(req.params.marketId);
  const theoryId = Number(req.params.theoryId);
  const rows = await db.select().from(marketSystemElementsTable)
    .where(and(
      eq(marketSystemElementsTable.marketSystemId, marketId),
      eq(marketSystemElementsTable.theoryId, theoryId),
    ))
    .orderBy(asc(marketSystemElementsTable.ring), asc(marketSystemElementsTable.position), asc(marketSystemElementsTable.createdAt));
  res.json(rows);
});

router.post("/theories/:theoryId/market-systems/:marketId/elements", async (req, res) => {
  const marketId = Number(req.params.marketId);
  const theoryId = Number(req.params.theoryId);
  const parsed = insertMarketSystemElementSchema.safeParse({ ...req.body, marketSystemId: marketId, theoryId });
  if (!parsed.success) { res.status(400).json({ error: parsed.error.issues }); return; }
  const [row] = await db.insert(marketSystemElementsTable).values(parsed.data).returning();
  await logChange(req, { theoryId, action: "create", entityType: "market_system_element", entityLabel: row.title ?? "", summary: `Added market system element "${row.title ?? ""}"` });
  res.status(201).json(row);
});

router.patch("/theories/:theoryId/market-systems/:marketId/elements/:id", async (req, res) => {
  const id = Number(req.params.id);
  const marketId = Number(req.params.marketId);
  const theoryId = Number(req.params.theoryId);
  const allowed = ["ring","category","title","description","actors","constraints","opportunities","color","position","linkedMarketSystemId"] as const;
  const patch: Record<string, unknown> = { updatedAt: new Date() };
  for (const k of allowed) { if (k in req.body) patch[k] = req.body[k]; }
  const [row] = await db.update(marketSystemElementsTable).set(patch)
    .where(and(
      eq(marketSystemElementsTable.id, id),
      eq(marketSystemElementsTable.marketSystemId, marketId),
      eq(marketSystemElementsTable.theoryId, theoryId),
    ))
    .returning();
  if (!row) { res.status(404).json({ error: "Not found" }); return; }
  await logChange(req, { theoryId, action: "update", entityType: "market_system_element", entityLabel: row.title ?? "", summary: `Updated market system element "${row.title ?? ""}"` });
  res.json(row);
});

router.delete("/theories/:theoryId/market-systems/:marketId/elements/:id", async (req, res) => {
  const id = Number(req.params.id);
  const marketId = Number(req.params.marketId);
  const theoryId = Number(req.params.theoryId);
  const [row] = await db.select().from(marketSystemElementsTable)
    .where(and(
      eq(marketSystemElementsTable.id, id),
      eq(marketSystemElementsTable.marketSystemId, marketId),
      eq(marketSystemElementsTable.theoryId, theoryId),
    ));
  await db.delete(marketSystemElementsTable)
    .where(and(
      eq(marketSystemElementsTable.id, id),
      eq(marketSystemElementsTable.marketSystemId, marketId),
      eq(marketSystemElementsTable.theoryId, theoryId),
    ));
  if (row) {
    await logChange(req, { theoryId, action: "delete", entityType: "market_system_element", entityLabel: row.title ?? "", summary: `Deleted market system element "${row.title ?? ""}"` });
  }
  res.status(204).send();
});

export default router;
