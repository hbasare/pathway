import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import {
  portfoliosTable, insertPortfolioSchema,
  theoriesTable, componentsTable, componentIndicatorsTable,
} from "@workspace/db";
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

// Program logframe — aggregates ALL portfolios + their theories + components + indicators
router.get("/program-logframe", async (_req, res) => {
  const portfolios = await db.select().from(portfoliosTable).orderBy(portfoliosTable.createdAt);

  const detailedPortfolios = await Promise.all(
    portfolios.map(async (portfolio) => {
      const theories = await db.select().from(theoriesTable).where(eq(theoriesTable.portfolioId, portfolio.id));

      const detailedTheories = await Promise.all(
        theories.map(async (theory) => {
          const components = await db.select().from(componentsTable).where(eq(componentsTable.theoryId, theory.id));
          const indicators = await db
            .select()
            .from(componentIndicatorsTable)
            .where(eq(componentIndicatorsTable.theoryId, theory.id))
            .orderBy(componentIndicatorsTable.position, componentIndicatorsTable.id);

          const componentsWithIndicators = components.map(c => ({
            ...c,
            componentIndicators: indicators.filter(ind => ind.componentId === c.id),
          }));

          return { ...theory, components: componentsWithIndicators };
        })
      );

      return { portfolio, theories: detailedTheories };
    })
  );

  res.json({ portfolios: detailedPortfolios });
});

// Portfolio logframe — aggregates all intervention theory components + indicators for a portfolio
router.get("/portfolios/:id/logframe", async (req, res) => {
  const id = Number(req.params.id);

  const [portfolio] = await db.select().from(portfoliosTable).where(eq(portfoliosTable.id, id));
  if (!portfolio) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  const theories = await db.select().from(theoriesTable).where(eq(theoriesTable.portfolioId, id));

  const detailedTheories = await Promise.all(
    theories.map(async (theory) => {
      const components = await db.select().from(componentsTable).where(eq(componentsTable.theoryId, theory.id));
      const indicators = await db
        .select()
        .from(componentIndicatorsTable)
        .where(eq(componentIndicatorsTable.theoryId, theory.id))
        .orderBy(componentIndicatorsTable.position, componentIndicatorsTable.id);

      const componentsWithIndicators = components.map(c => ({
        ...c,
        componentIndicators: indicators.filter(ind => ind.componentId === c.id),
      }));

      return { ...theory, components: componentsWithIndicators };
    })
  );

  res.json({ portfolio, theories: detailedTheories });
});

export default router;
