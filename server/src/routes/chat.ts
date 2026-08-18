import { Router } from "express";
import { askQuestionRequestSchema } from "@docu-mind/shared";
import { asyncHandler, ApiError } from "../middlewares/error-handler.js";
import * as chatService from "../services/chat-service.js";

const router = Router();

router.get(
  "/conversations",
  asyncHandler(async (_request, response) => {
    const conversations = await chatService.listConversations();
    response.json({ conversations });
  }),
);

router.get(
  "/conversations/:id/messages",
  asyncHandler(async (request, response) => {
    const messages = await chatService.getConversationMessages(request.params.id);
    response.json({ messages });
  }),
);

router.patch(
  "/conversations/:id",
  asyncHandler(async (request, response) => {
    if (typeof request.body.pinned === "boolean") {
      await chatService.togglePinConversation(request.params.id, request.body.pinned);
    }
    response.status(204).send();
  }),
);

router.post(
  "/questions",
  asyncHandler(async (request, response) => {
    const parsed = askQuestionRequestSchema.safeParse(request.body);
    if (!parsed.success) {
      throw new ApiError(400, parsed.error.errors.map((e) => e.message).join(", "));
    }

    const result = await chatService.askQuestion(parsed.data);
    response.status(201).json(result);
  }),
);

export default router;
