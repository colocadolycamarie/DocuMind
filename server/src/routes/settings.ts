import { Router } from "express";
import { updateSettingsRequestSchema } from "@docu-mind/shared";
import { asyncHandler, ApiError } from "../middlewares/error-handler.js";
import * as settingsService from "../services/settings-service.js";

const router = Router();

router.get(
  "/settings",
  asyncHandler(async (_request, response) => {
    const settings = await settingsService.getSettings();
    response.json({ settings });
  }),
);

router.patch(
  "/settings",
  asyncHandler(async (request, response) => {
    const parsed = updateSettingsRequestSchema.safeParse(request.body);
    if (!parsed.success) {
      throw new ApiError(400, parsed.error.errors.map((e) => e.message).join(", "));
    }
    const settings = await settingsService.updateSettings(parsed.data);
    response.json({ settings });
  }),
);

export default router;
