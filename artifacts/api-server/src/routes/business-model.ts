import { Router, type IRouter } from "express";
import path from "path";
import fs from "fs";
import multer from "multer";
import { db } from "@workspace/db";
import { businessModelActorsTable, insertBusinessModelActorSchema, theoriesTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { generateImageBuffer } from "@workspace/integrations-openai-ai-server/image";
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

// ── Images static directory ──────────────────────────────────────────────────
const IMAGES_DIR = path.join(process.cwd(), "public", "business-model-images");
if (!fs.existsSync(IMAGES_DIR)) fs.mkdirSync(IMAGES_DIR, { recursive: true });

// ── Strategy documents directory ─────────────────────────────────────────────
const DOCS_DIR = path.join(process.cwd(), "public", "strategy-documents");
if (!fs.existsSync(DOCS_DIR)) fs.mkdirSync(DOCS_DIR, { recursive: true });

// ── Multer upload config (images) ─────────────────────────────────────────────
const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, IMAGES_DIR),
    filename: (req, _file, cb) => {
      const theoryId = req.params.theoryId ?? "unknown";
      cb(null, `theory-${theoryId}-${Date.now()}.png`);
    },
  }),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith("image/")) cb(null, true);
    else cb(new Error("Only image files are allowed"));
  },
});

// ── Multer upload config (strategy documents) ─────────────────────────────────
const ALLOWED_DOC_MIMES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
]);

const uploadDoc = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, DOCS_DIR),
    filename: (req, file, cb) => {
      const theoryId = req.params.theoryId ?? "unknown";
      const ext = path.extname(file.originalname) || ".pdf";
      cb(null, `strategy-${theoryId}-${Date.now()}${ext}`);
    },
  }),
  limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_DOC_MIMES.has(file.mimetype)) cb(null, true);
    else cb(new Error("Only PDF, Word (.doc/.docx) or plain text files are allowed"));
  },
});

// ── Strategy Document Upload ──────────────────────────────────────────────────
router.post(
  "/theories/:theoryId/strategy-document/upload",
  uploadDoc.single("document"),
  async (req, res) => {
    const theoryId = Number(req.params.theoryId);
    const theory = await getAuthorizedTheory(req, theoryId);
    if (!theory) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    const file = req.file;
    if (!file) {
      res.status(400).json({ error: "No document file provided" });
      return;
    }
    const docUrl = `/api/strategy-documents/${file.filename}`;
    await db.update(theoriesTable)
      .set({ strategyDocumentPath: docUrl, strategyDocumentName: file.originalname, updatedAt: new Date() })
      .where(and(eq(theoriesTable.id, theoryId), eq(theoriesTable.orgId, theory.orgId)));
    res.json({ documentUrl: docUrl, documentName: file.originalname });
  },
);

router.delete("/theories/:theoryId/strategy-document", async (req, res) => {
  const theoryId = Number(req.params.theoryId);
  const theory = await getAuthorizedTheory(req, theoryId);
  if (!theory) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  if (theory.strategyDocumentPath) {
    const filename = path.basename(theory.strategyDocumentPath);
    const filePath = path.join(DOCS_DIR, filename);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  }
  await db.update(theoriesTable)
    .set({ strategyDocumentPath: "", strategyDocumentName: "", updatedAt: new Date() })
    .where(and(eq(theoriesTable.id, theoryId), eq(theoriesTable.orgId, theory.orgId)));
  res.status(204).send();
});

// ── Actors CRUD ──────────────────────────────────────────────────────────────
router.get("/theories/:theoryId/business-model/actors", async (req, res) => {
  const theoryId = Number(req.params.theoryId);
  const theory = await getAuthorizedTheory(req, theoryId);
  if (!theory) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  const actors = await db.select()
    .from(businessModelActorsTable)
    .where(and(eq(businessModelActorsTable.theoryId, theoryId), eq(businessModelActorsTable.orgId, theory.orgId)))
    .orderBy(businessModelActorsTable.position, businessModelActorsTable.createdAt);
  res.json(actors);
});

router.post("/theories/:theoryId/business-model/actors", async (req, res) => {
  const theoryId = Number(req.params.theoryId);
  const theory = await getAuthorizedTheory(req, theoryId);
  if (!theory) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  const parsed = insertBusinessModelActorSchema.safeParse({ ...req.body, theoryId, orgId: theory.orgId });
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues });
    return;
  }
  const [actor] = await db.insert(businessModelActorsTable).values(parsed.data).returning();
  await logChange(req, { theoryId, orgId: theory.orgId, action: "create", entityType: "business_model_actor", entityLabel: actor.actorName ?? "", summary: `Added business model actor "${actor.actorName ?? ""}"` });
  res.status(201).json(actor);
});

router.put("/theories/:theoryId/business-model/actors/:id", async (req, res) => {
  const id = Number(req.params.id);
  const theoryId = Number(req.params.theoryId);
  const theory = await getAuthorizedTheory(req, theoryId);
  if (!theory) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  const parsed = insertBusinessModelActorSchema.safeParse({ ...req.body, theoryId, orgId: theory.orgId });
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues });
    return;
  }
  const [updated] = await db.update(businessModelActorsTable)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(and(eq(businessModelActorsTable.id, id), eq(businessModelActorsTable.orgId, theory.orgId)))
    .returning();
  if (!updated) { res.status(404).json({ error: "Not found" }); return; }
  await logChange(req, { theoryId, orgId: theory.orgId, action: "update", entityType: "business_model_actor", entityLabel: updated.actorName ?? "", summary: `Updated business model actor "${updated.actorName ?? ""}"` });
  res.json(updated);
});

router.delete("/theories/:theoryId/business-model/actors/:id", async (req, res) => {
  const id = Number(req.params.id);
  const theoryId = Number(req.params.theoryId);
  const theory = await getAuthorizedTheory(req, theoryId);
  if (!theory) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  const [actor] = await db.select().from(businessModelActorsTable).where(and(eq(businessModelActorsTable.id, id), eq(businessModelActorsTable.orgId, theory.orgId)));
  await db.delete(businessModelActorsTable).where(and(eq(businessModelActorsTable.id, id), eq(businessModelActorsTable.orgId, theory.orgId)));
  if (actor) {
    await logChange(req, { theoryId, orgId: theory.orgId, action: "delete", entityType: "business_model_actor", entityLabel: actor.actorName ?? "", summary: `Deleted business model actor "${actor.actorName ?? ""}"` });
  }
  res.status(204).send();
});

// ── Upload Image ──────────────────────────────────────────────────────────────
router.post(
  "/theories/:theoryId/business-model/upload-image",
  upload.single("image"),
  async (req, res) => {
    const theoryId = Number(req.params.theoryId);
    const theory = await getAuthorizedTheory(req, theoryId);
    if (!theory) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    const file = req.file;
    if (!file) {
      res.status(400).json({ error: "No image file provided" });
      return;
    }
    const imageUrl = `/api/business-model-images/${file.filename}`;
    await db.update(theoriesTable)
      .set({ businessModelImagePath: imageUrl, updatedAt: new Date() })
      .where(and(eq(theoriesTable.id, theoryId), eq(theoriesTable.orgId, theory.orgId)));
    res.json({ imageUrl });
  },
);

// ── AI Image Generation ──────────────────────────────────────────────────────
router.post("/theories/:theoryId/business-model/generate-image", async (req, res) => {
  const theoryId = Number(req.params.theoryId);
  const theory = await getAuthorizedTheory(req, theoryId);
  if (!theory) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  const { prompt } = req.body as { prompt: string };
  if (!prompt || typeof prompt !== "string") {
    res.status(400).json({ error: "prompt is required" });
    return;
  }

  const enrichedPrompt = `Business model ecosystem diagram: ${prompt}. Style: clean flat design infographic, white background, colorful icons for each actor/player, arrows showing relationships and flows between actors, labels for each entity and connection, professional and modern look. Include all named stakeholders as distinct visual icons with their names beneath them.`;

  try {
    const buffer = await generateImageBuffer(enrichedPrompt, "1024x1024");

    const filename = `theory-${theoryId}-${Date.now()}.png`;
    const filePath = path.join(IMAGES_DIR, filename);
    fs.writeFileSync(filePath, buffer);

    const imageUrl = `/api/business-model-images/${filename}`;

    // Store the image path on the theory
    await db.update(theoriesTable)
      .set({ businessModelImagePath: imageUrl, updatedAt: new Date() })
      .where(and(eq(theoriesTable.id, theoryId), eq(theoriesTable.orgId, theory.orgId)));

    res.json({ imageUrl });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Image generation failed:", message);
    res.status(500).json({ error: "Image generation failed: " + message });
  }
});

export default router;
