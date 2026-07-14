import { Router, type IRouter } from "express";
import { requireAuth } from "../middleware/auth";
import { db } from "@workspace/db";
import { theoryAssignmentsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import healthRouter from "./health";
import authRouter from "./auth";
import usersRouter from "./users";
import portfoliosRouter from "./portfolios";
import theoriesRouter from "./theories";
import businessModelRouter from "./business-model";
import systemicChangeRouter from "./systemic-change";
import locationsRouter from "./locations";
import marketSystemsRouter from "./market-systems";
import storageRouter from "./storage";
import theoryDocumentsRouter from "./theory-documents";
import chatRouter from "./chat";

const router: IRouter = Router();

// Public routes (no auth required)
router.use(healthRouter);
router.use(authRouter);

// Protected routes — require login
router.use(requireAuth);

// Write operations access control:
// - senior_manager, auditor, donor: blocked from all writes
// - manager: all writes allowed
// - member: writes allowed only on theories they are assigned to
router.use(async (req, res, next) => {
  if (!["POST", "PATCH", "DELETE", "PUT"].includes(req.method)) return next();
  if (req.path.startsWith("/users")) return next();
  if (req.path.startsWith("/chat")) return next();

  const role = req.session.role ?? "";
  if (!["manager", "member", "system_admin"].includes(role)) {
    res.status(403).json({ error: "You have read-only access and cannot edit content" });
    return;
  }

  if (role === "member") {
    const match = req.path.match(/^\/theories\/(\d+)/);
    if (match) {
      const theoryId = parseInt(match[1], 10);
      if (!isNaN(theoryId)) {
        const [assignment] = await db
          .select({ id: theoryAssignmentsTable.id })
          .from(theoryAssignmentsTable)
          .where(and(
            eq(theoryAssignmentsTable.theoryId, theoryId),
            eq(theoryAssignmentsTable.userId, req.session.userId!)
          ));
        if (!assignment) {
          res.status(403).json({ error: "You are not assigned to this theory" });
          return;
        }
      }
    }
  }

  next();
});

router.use(usersRouter);
router.use(storageRouter);
router.use(portfoliosRouter);
router.use(theoriesRouter);
router.use(businessModelRouter);
router.use(systemicChangeRouter);
router.use(locationsRouter);
router.use(marketSystemsRouter);
router.use(theoryDocumentsRouter);
router.use(chatRouter);

export default router;
