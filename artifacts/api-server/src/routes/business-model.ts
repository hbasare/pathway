import { Router, type IRouter } from "express";
import path from "path";
import fs from "fs";
import multer from "multer";
import { db } from "@workspace/db";
import { businessModelActorsTable, insertBusinessModelActorSchema, theoriesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { generateImageBuffer } from "@workspace/integrations-openai-ai-server/image";

const router: IRouter = Router();

// ── Images static directory ──────────────────────────────────────────────────
const IMAGES_DIR = path.join(process.cwd(), "public", "business-model-images");
if (!fs.existsSync(IMAGES_DIR)) fs.mkdirSync(IMAGES_DIR, { recursive: true });

// ── Multer upload config ──────────────────────────────────────────────────────
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

// ── Actors CRUD ──────────────────────────────────────────────────────────────
router.get("/theories/:theoryId/business-model/actors", async (req, res) => {
  const theoryId = Number(req.params.theoryId);
  const actors = await db.select()
    .from(businessModelActorsTable)
    .where(eq(businessModelActorsTable.theoryId, theoryId))
    .orderBy(businessModelActorsTable.position, businessModelActorsTable.createdAt);
  res.json(actors);
});

router.post("/theories/:theoryId/business-model/actors", async (req, res) => {
  const theoryId = Number(req.params.theoryId);
  const parsed = insertBusinessModelActorSchema.safeParse({ ...req.body, theoryId });
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues });
    return;
  }
  const [actor] = await db.insert(businessModelActorsTable).values(parsed.data).returning();
  res.status(201).json(actor);
});

router.put("/theories/:theoryId/business-model/actors/:id", async (req, res) => {
  const id = Number(req.params.id);
  const theoryId = Number(req.params.theoryId);
  const parsed = insertBusinessModelActorSchema.safeParse({ ...req.body, theoryId });
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues });
    return;
  }
  const [updated] = await db.update(businessModelActorsTable)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(eq(businessModelActorsTable.id, id))
    .returning();
  if (!updated) { res.status(404).json({ error: "Not found" }); return; }
  res.json(updated);
});

router.delete("/theories/:theoryId/business-model/actors/:id", async (req, res) => {
  const id = Number(req.params.id);
  await db.delete(businessModelActorsTable).where(eq(businessModelActorsTable.id, id));
  res.status(204).send();
});

// ── Upload Image ──────────────────────────────────────────────────────────────
router.post(
  "/theories/:theoryId/business-model/upload-image",
  upload.single("image"),
  async (req, res) => {
    const theoryId = Number(req.params.theoryId);
    const file = req.file;
    if (!file) {
      res.status(400).json({ error: "No image file provided" });
      return;
    }
    const imageUrl = `/api/business-model-images/${file.filename}`;
    await db.update(theoriesTable)
      .set({ businessModelImagePath: imageUrl, updatedAt: new Date() })
      .where(eq(theoriesTable.id, theoryId));
    res.json({ imageUrl });
  },
);

// ── AI Image Generation ──────────────────────────────────────────────────────
router.post("/theories/:theoryId/business-model/generate-image", async (req, res) => {
  const theoryId = Number(req.params.theoryId);
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
      .where(eq(theoriesTable.id, theoryId));

    res.json({ imageUrl });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Image generation failed:", message);
    res.status(500).json({ error: "Image generation failed: " + message });
  }
});

export default router;
