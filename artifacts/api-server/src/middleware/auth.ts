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
  if (req.session.role !== "manager" && req.session.role !== "system_admin") {
    res.status(403).json({ error: "Only evaluation managers or system admins can perform this action" });
    return;
  }
  next();
}

/** Allows manager + member + system_admin to perform write operations; blocks senior_manager, auditor, donor */
export function requireEditor(req: Request, res: Response, next: NextFunction) {
  if (!req.session?.userId) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  const editorRoles = ["manager", "member", "system_admin"];
  if (!editorRoles.includes(req.session.role ?? "")) {
    res.status(403).json({ error: "You have read-only access and cannot edit content" });
    return;
  }
  next();
}

export function requireSystemAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.session?.userId) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  if (req.session.role !== "system_admin") {
    res.status(403).json({ error: "Only system administrators can perform this action" });
    return;
  }
  next();
}

