import { db } from "@workspace/db";
import { changeLogTable } from "@workspace/db";
import type { Request } from "express";

export type ChangeAction = "create" | "update" | "delete";

interface LogChangeParams {
  theoryId: number;
  orgId?: number;
  action: ChangeAction;
  entityType: string;
  entityLabel?: string;
  summary?: string;
}

/**
 * Records an entry in the per-intervention change log. Never throws —
 * a logging failure must not break the underlying write operation.
 */
export async function logChange(req: Request, params: LogChangeParams): Promise<void> {
  try {
    const orgId = params.orgId ?? req.session?.orgId;
    if (!orgId) {
      console.warn("Skipping change log insert: orgId is missing.");
      return;
    }
    await db.insert(changeLogTable).values({
      theoryId: params.theoryId,
      orgId,
      userId: req.session?.userId ?? null,
      username: req.session?.username ?? "",
      displayName: req.session?.displayName ?? "",
      action: params.action,
      entityType: params.entityType,
      entityLabel: params.entityLabel ?? "",
      summary: params.summary ?? "",
    });
  } catch (err) {
    console.error("Failed to record change log entry:", err);
  }
}
