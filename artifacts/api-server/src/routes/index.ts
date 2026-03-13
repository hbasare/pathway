import { Router, type IRouter } from "express";
import healthRouter from "./health";
import theoriesRouter from "./theories";

const router: IRouter = Router();

router.use(healthRouter);
router.use(theoriesRouter);

export default router;
