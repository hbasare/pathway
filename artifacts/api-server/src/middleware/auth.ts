import type { Request, Response, NextFunction } from "express";

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.session?.userId) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  next();
}

export function requireManager(req: Request, res: Response, next: NextFunction) {
  if (!req.session?.userId) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  if (req.session.role !== "manager") {
    res.status(403).json({ error: "Only evaluation managers can perform this action" });
    return;
  }
  next();
}

/** Allows manager + member to perform write operations; blocks senior_manager, auditor, donor */
export function requireEditor(req: Request, res: Response, next: NextFunction) {
  if (!req.session?.userId) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  const editorRoles = ["manager", "member"];
  if (!editorRoles.includes(req.session.role ?? "")) {
    res.status(403).json({ error: "You have read-only access and cannot edit content" });
    return;
  }
  next();
}
