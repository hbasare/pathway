import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { theoryDocumentsTable, insertTheoryDocumentSchema } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { ObjectStorageService } from "../lib/objectStorage";
import { logChange } from "../lib/changelog";

const router: IRouter = Router();
const storage = new ObjectStorageService();

// List all documents for a theory
router.get("/theories/:theoryId/documents", async (req, res) => {
  const theoryId = Number(req.params.theoryId);
  const docs = await db
    .select()
    .from(theoryDocumentsTable)
    .where(eq(theoryDocumentsTable.theoryId, theoryId))
    .orderBy(theoryDocumentsTable.uploadedAt);
  res.json(docs);
});

// Save document metadata after presigned upload completes
router.post("/theories/:theoryId/documents", async (req, res) => {
  const theoryId = Number(req.params.theoryId);
  const parsed = insertTheoryDocumentSchema.safeParse({ ...req.body, theoryId });
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues });
    return;
  }
  const [doc] = await db.insert(theoryDocumentsTable).values(parsed.data).returning();
  await logChange(req, { theoryId, action: "create", entityType: "document", entityLabel: doc.name ?? "", summary: `Uploaded document "${doc.name ?? ""}"` });
  res.status(201).json(doc);
});

// Delete a document
router.delete("/theories/:theoryId/documents/:docId", async (req, res) => {
  const theoryId = Number(req.params.theoryId);
  const docId = Number(req.params.docId);
  const [doc] = await db.select().from(theoryDocumentsTable)
    .where(and(eq(theoryDocumentsTable.id, docId), eq(theoryDocumentsTable.theoryId, theoryId)));
  await db
    .delete(theoryDocumentsTable)
    .where(and(eq(theoryDocumentsTable.id, docId), eq(theoryDocumentsTable.theoryId, theoryId)));
  if (doc) {
    await logChange(req, { theoryId, action: "delete", entityType: "document", entityLabel: doc.name ?? "", summary: `Deleted document "${doc.name ?? ""}"` });
  }
  res.status(204).send();
});

// Serve a document (proxy from object storage)
router.get("/theories/:theoryId/documents/:docId/download", async (req, res) => {
  const theoryId = Number(req.params.theoryId);
  const docId = Number(req.params.docId);
  const [doc] = await db
    .select()
    .from(theoryDocumentsTable)
    .where(and(eq(theoryDocumentsTable.id, docId), eq(theoryDocumentsTable.theoryId, theoryId)));
  if (!doc) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  try {
    const file = await storage.getObjectEntityFile(doc.objectPath);
    const response = await storage.downloadObject(file);
    const headers: Record<string, string> = {};
    response.headers.forEach((value, key) => { headers[key] = value; });
    // Force a download with the original filename
    headers["content-disposition"] = `attachment; filename="${doc.name.replace(/"/g, '\\"')}"`;
    res.set(headers).status(response.status);
    const buf = await response.arrayBuffer();
    res.send(Buffer.from(buf));
  } catch {
    res.status(404).json({ error: "File not found in storage" });
  }
});

export default router;
