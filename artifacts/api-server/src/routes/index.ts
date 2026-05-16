import { Router, type IRouter } from "express";
import { requireAuth } from "../middleware/auth";
import healthRouter from "./health";
import authRouter from "./auth";
import usersRouter from "./users";
import portfoliosRouter from "./portfolios";
import theoriesRouter from "./theories";
import businessModelRouter from "./business-model";
import systemicChangeRouter from "./systemic-change";
import storageRouter from "./storage";
import theoryDocumentsRouter from "./theory-documents";

const router: IRouter = Router();

// Public routes (no auth required)
router.use(healthRouter);
router.use(authRouter);

// Protected routes — require login
router.use(requireAuth);

// Write operations require editor role (manager or member)
// User routes have their own requireManager check so are excluded
router.use((req, res, next) => {
  if (!["POST", "PATCH", "DELETE", "PUT"].includes(req.method)) return next();
  if (req.path.startsWith("/users")) return next();
  const editorRoles = ["manager", "member"];
  if (!editorRoles.includes(req.session.role ?? "")) {
    res.status(403).json({ error: "You have read-only access and cannot edit content" });
    return;
  }
  next();
});

router.use(usersRouter);
router.use(storageRouter);
router.use(portfoliosRouter);
router.use(theoriesRouter);
router.use(businessModelRouter);
router.use(systemicChangeRouter);
router.use(theoryDocumentsRouter);

export default router;
