import { Router, type IRouter } from "express";
import healthRouter from "./health";
import theoriesRouter from "./theories";
import businessModelRouter from "./business-model";

const router: IRouter = Router();

router.use(healthRouter);
router.use(theoriesRouter);
router.use(businessModelRouter);

export default router;
