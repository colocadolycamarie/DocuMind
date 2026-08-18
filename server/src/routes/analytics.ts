import { Router } from "express";
import { asyncHandler } from "../middlewares/error-handler.js";
import { getAnalytics } from "../services/analytics-service.js";

const router = Router();

router.get(
  "/analytics",
  asyncHandler(async (_request, response) => {
    const analytics = await getAnalytics();
    response.json(analytics);
  }),
);

export default router;
