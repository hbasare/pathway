import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { systemicChangesTable, insertSystemicChangeSchema } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { openai } from "@workspace/integrations-openai-ai-server";
import { generateMsrInfographic, type ScoreSummaryEntry } from "../lib/msr-infographic";

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

router.post("/theories/:theoryId/msr-ai-analysis", async (req, res) => {
  const { scoreSummary, interventionTitle } = req.body as {
    scoreSummary: ScoreSummaryEntry[];
    interventionTitle?: string;
  };

  const systemPrompt = `You are an expert in market systems development, specialising in the Market System Resilience (MSR) framework. MSR assesses how proactively market systems respond to shocks and stresses across four domains, each scored 1–4:
- 1: Much more reactive (system relies on external support)
- 2: Sometimes reactive (some proactive behaviour emerging)
- 3: Somewhat proactive (system increasingly self-organising)
- 4: Much more proactive (system fully self-organising and adaptive)

Domains:
- Structural Domain: physical and relational architecture (connectivity, diversity, integration, flexibility)
- Behavioural Domain: actor motivations and capacities
- Enabling Environment Domain: rules, norms, policies, infrastructure
- Relational Domain: trust, power dynamics, collective action

Your task: analyse the MSR score data and return a structured JSON assessment.

For each domain, produce a 0–100 score (map 1→0, 2→33, 3→67, 4→100, interpolate for fractions) and a status:
- "reactive" (0–25), "emerging" (26–50), "transitioning" (51–75), "proactive" (76–100), "no-data" (no scores)

Return ONLY valid JSON with this exact structure (no markdown, no extra text):
{
  "overallScore": <integer 0-100>,
  "overallAssessment": "<2-3 sentence narrative>",
  "trajectoryNarrative": "<1-2 sentence description of the market system's current trajectory>",
  "structural": {
    "score": <integer 0-100>,
    "status": "<reactive|emerging|transitioning|proactive|no-data>",
    "headline": "<one sentence headline finding>",
    "findings": ["<finding 1>", "<finding 2>"],
    "recommendations": ["<recommendation 1>", "<recommendation 2>"],
    "strongComponents": ["<component name>"],
    "weakComponents": ["<component name>"]
  },
  "behavioural": { <same structure> },
  "enablingEnvironment": { <same structure> },
  "relational": { <same structure> },
  "priorityActions": ["<action 1>", "<action 2>", "<action 3>"]
}

If a domain has no scores (all null), set status to "no-data", score to 0, headline to "No indicators scored for this domain yet", findings/recommendations/strongComponents/weakComponents to [].`;

  const title = interventionTitle ?? "this intervention";
  const userMessage = `MSR assessment data for "${title}":\n\n${JSON.stringify(scoreSummary, null, 2)}\n\nEach component shows overallAvg (1–4 scale, null = not scored) and scores by period.\n\nPlease analyse and return the structured JSON assessment.`;

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
    console.error("MSR AI analysis error:", err);
    res.status(500).json({ error: "Failed to generate MSR analysis" });
  }
});

router.post("/theories/:theoryId/msr-synthesis-image", async (req, res) => {
  const { scoreSummary, interventionTitle } = req.body as {
    scoreSummary: ScoreSummaryEntry[];
    interventionTitle?: string;
  };

  try {
    const svg = generateMsrInfographic(scoreSummary ?? [], interventionTitle);
    const b64 = Buffer.from(svg, "utf-8").toString("base64");
    res.json({ b64_svg: b64 });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("MSR infographic error:", message);
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
