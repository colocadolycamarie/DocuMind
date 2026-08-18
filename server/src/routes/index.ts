import { Router } from "express";
import healthRouter from "./health.js";
import documentsRouter from "./documents.js";
import chatRouter from "./chat.js";
import analyticsRouter from "./analytics.js";
import settingsRouter from "./settings.js";

const router = Router();

router.use(healthRouter);
router.use(documentsRouter);
router.use(chatRouter);
router.use(analyticsRouter);
router.use(settingsRouter);

export default router;
