import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { portfoliosTable, insertPortfolioSchema } from "@workspace/db";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

router.get("/portfolios", async (_req, res) => {
  const portfolios = await db.select().from(portfoliosTable).orderBy(portfoliosTable.createdAt);
  res.json(portfolios);
});

router.post("/portfolios", async (req, res) => {
  const parsed = insertPortfolioSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues });
    return;
  }
  const [portfolio] = await db.insert(portfoliosTable).values(parsed.data).returning();
  res.status(201).json(portfolio);
});

router.get("/portfolios/:id", async (req, res) => {
  const id = Number(req.params.id);
  const [portfolio] = await db.select().from(portfoliosTable).where(eq(portfoliosTable.id, id));
  if (!portfolio) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json(portfolio);
});

router.patch("/portfolios/:id", async (req, res) => {
  const id = Number(req.params.id);
  const parsed = insertPortfolioSchema.partial().safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues });
    return;
  }
  const [updated] = await db
    .update(portfoliosTable)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(eq(portfoliosTable.id, id))
    .returning();
  if (!updated) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json(updated);
});

router.delete("/portfolios/:id", async (req, res) => {
  const id = Number(req.params.id);
  await db.delete(portfoliosTable).where(eq(portfoliosTable.id, id));
  res.status(204).send();
});

export default router;
