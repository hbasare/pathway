import { Router, type IRouter } from "express";
import healthRouter from "./health";
import portfoliosRouter from "./portfolios";
import theoriesRouter from "./theories";
import businessModelRouter from "./business-model";
import storageRouter from "./storage";
import theoryDocumentsRouter from "./theory-documents";

const router: IRouter = Router();

router.use(healthRouter);
router.use(storageRouter);
router.use(portfoliosRouter);
router.use(theoriesRouter);
router.use(businessModelRouter);
router.use(theoryDocumentsRouter);

export default router;
