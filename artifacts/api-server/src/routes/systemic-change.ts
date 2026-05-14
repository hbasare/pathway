import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { systemicChangesTable, insertSystemicChangeSchema } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { openai } from "@workspace/integrations-openai-ai-server";
import { generateImageBuffer } from "@workspace/integrations-openai-ai-server/image";

const router: IRouter = Router();

router.post("/theories/:theoryId/systemic-changes/ai-analysis", async (req, res) => {
  const theoryId = Number(req.params.theoryId);
  const entries = await db
    .select()
    .from(systemicChangesTable)
    .where(eq(systemicChangesTable.theoryId, theoryId))
    .orderBy(systemicChangesTable.position, systemicChangesTable.createdAt);

  const entrySummaries = entries.map(e => {
    let stageObj: Record<string, unknown> = {};
    try { stageObj = JSON.parse(e.stageData ?? "{}"); } catch {}
    return {
      partnerName: e.dimension,   // actor/partner name — use this for the partners array
      stage: e.frameworkTag,      // adopt | adapt | expand | respond
      period: e.periodLabel,
      description: e.description,
      changeObserved: e.changeObserved,
      level: e.level,
      status: e.status,
      stageData: stageObj,
    };
  });

  const systemPrompt = `You are an expert in market systems development and Theory of Change analysis, specialising in the AAER (Adopt, Adapt, Expand, Respond) framework for measuring progress towards sustainable systemic change.

You will receive AAER tracking data for a development intervention. Each entry has a "partnerName" field — this is the actor or market participant being tracked at that stage.

Your task is to analyse the evidence and produce a structured assessment of progress towards sustainable systemic change.

For each stage, score 0–100 based on the evidence provided:
- 0–25: Nascent — very limited or no evidence
- 26–50: Emerging — some early signs but fragile
- 51–75: Moderate — clear progress, some gaps remain
- 76–100: Strong — robust, self-sustaining evidence

Also compute an overall score (weighted: Adopt 25%, Adapt 30%, Expand 25%, Respond 20%).

IMPORTANT — for the "partners" field in each stage:
- adopt / adapt / expand: list the unique partnerNames from entries recorded at that stage. If a partner name is mentioned in description or changeObserved text, include it too.
- respond: list potential NEW market entrants (organisations or actor types not currently in the adopt/adapt/expand data) that could scale or replicate the model — infer these from context in the evidence. These are new-to-market players, not existing tracked partners.
- If no partners can be identified, return an empty array.

Return ONLY valid JSON matching this exact structure (no markdown, no extra text):
{
  "overallScore": <integer 0-100>,
  "overallAssessment": "<2-3 sentence overall narrative>",
  "pathwayNarrative": "<1-2 sentence description of where the intervention sits on the pathway to sustainable change>",
  "adopt": {
    "score": <integer 0-100>,
    "status": "<nascent|emerging|moderate|strong|no-data>",
    "headline": "<one sentence headline finding>",
    "findings": ["<finding 1>", "<finding 2>"],
    "recommendations": ["<recommendation 1>"],
    "partners": ["<partner name>"]
  },
  "adapt": { <same structure> },
  "expand": { <same structure> },
  "respond": { <same structure with new entrant names/types> },
  "nextPriorityActions": ["<action 1>", "<action 2>", "<action 3>"]
}

If a stage has no data entries at all, set status to "no-data", score to 0, headline to "No data recorded for this stage yet", findings to [], recommendations to ["Begin recording observations for this stage"], and partners to [].`;

  const userMessage = `Here is the AAER tracking data for this intervention:\n\n${JSON.stringify(entrySummaries, null, 2)}\n\nPlease analyse this data and return the structured JSON assessment.`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-5.4",
      max_completion_tokens: 8192,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
    });

    const raw = response.choices[0]?.message?.content ?? "{}";
    let analysis: Record<string, unknown>;
    try {
      analysis = JSON.parse(raw);
    } catch {
      const match = raw.match(/\{[\s\S]*\}/);
      if (!match) throw new Error("No JSON found in response");
      analysis = JSON.parse(match[0]);
    }
    res.json(analysis);
  } catch (err) {
    console.error("AI analysis error:", err);
    res.status(500).json({ error: "Failed to generate AI analysis" });
  }
});

router.post("/theories/:theoryId/msr-synthesis-image", async (req, res) => {
  const { scoreSummary, interventionTitle } = req.body as {
    scoreSummary: Array<{
      domain: string;
      components: Array<{ component: string; overallAvg: number | null; byPeriod: Record<string, number | null> }>;
    }>;
    interventionTitle?: string;
  };

  try {
    // Step 1: Use GPT to write a rich, evocative image prompt from the score data
    const promptResponse = await openai.chat.completions.create({
      model: "gpt-5.4",
      max_completion_tokens: 400,
      messages: [
        {
          role: "system",
          content: `You are an expert at creating evocative visual metaphors for market systems development. 
Generate a single detailed prompt for an AI image generator that artistically represents a market system's journey from reactive to proactive resilience.
Use vivid metaphorical imagery — living ecosystems, interconnected networks, natural landscapes, emerging light, pathways, webs of relationships.
The image must be painterly, artistic, and inspiring — never a chart, diagram, or text. 
Style: rich digital illustration or oil painting, warm hopeful tones, sense of emergence and growth.
Output ONLY the image generation prompt — no preamble, no explanation.`,
        },
        {
          role: "user",
          content: `Create an image prompt synthesising this MSR assessment for "${interventionTitle ?? "this market intervention"}":

${JSON.stringify(scoreSummary, null, 2)}

Higher scores (closer to 4) mean more proactive behaviour. Lower scores (closer to 1) mean reactive. 
Reflect the overall state of the system — which domains are stronger, which are emerging — in the visual metaphor.
The image should feel forward-looking and show the potential for transformation.`,
        },
      ],
    });

    const imagePrompt = promptResponse.choices[0]?.message?.content?.trim()
      ?? "A luminous network of interconnected market actors — farmers, traders, processors — woven into a thriving ecosystem, sunrise breaking through, symbolising the transformation from reactive survival to proactive market leadership, digital painting, warm golden tones";

    // Step 2: Generate the image
    const buffer = await generateImageBuffer(imagePrompt, "1536x1024");

    res.json({ b64_json: buffer.toString("base64"), prompt: imagePrompt });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const stack = err instanceof Error ? err.stack : undefined;
    console.error("MSR synthesis image error:", message, stack);
    res.status(500).json({ error: message });
  }
});

router.get("/theories/:theoryId/systemic-changes", async (req, res) => {
  const theoryId = Number(req.params.theoryId);
  const rows = await db
    .select()
    .from(systemicChangesTable)
    .where(eq(systemicChangesTable.theoryId, theoryId))
    .orderBy(systemicChangesTable.position, systemicChangesTable.createdAt);
  res.json(rows);
});

router.post("/theories/:theoryId/systemic-changes", async (req, res) => {
  const theoryId = Number(req.params.theoryId);
  const parsed = insertSystemicChangeSchema.safeParse({ ...req.body, theoryId });
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues });
    return;
  }
  const [row] = await db.insert(systemicChangesTable).values(parsed.data).returning();
  res.status(201).json(row);
});

router.put("/theories/:theoryId/systemic-changes/:id", async (req, res) => {
  const id = Number(req.params.id);
  const theoryId = Number(req.params.theoryId);
  const [row] = await db
    .update(systemicChangesTable)
    .set({ ...req.body, updatedAt: new Date() })
    .where(and(eq(systemicChangesTable.id, id), eq(systemicChangesTable.theoryId, theoryId)))
    .returning();
  if (!row) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json(row);
});

router.delete("/theories/:theoryId/systemic-changes/:id", async (req, res) => {
  const id = Number(req.params.id);
  const theoryId = Number(req.params.theoryId);
  await db
    .delete(systemicChangesTable)
    .where(and(eq(systemicChangesTable.id, id), eq(systemicChangesTable.theoryId, theoryId)));
  res.status(204).send();
});

export default router;
