import type { NextFunction, Request, Response } from "express";
import { logger } from "../lib/logger.js";

export class ApiError extends Error {
  status: number;
  code?: string;

  constructor(status: number, message: string, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export function notFoundHandler(_request: Request, response: Response) {
  response.status(404).json({ error: { message: "Not found" } });
}

export function errorHandler(
  error: unknown,
  _request: Request,
  response: Response,
  _next: NextFunction,
) {
  if (error instanceof ApiError) {
    response.status(error.status).json({ error: { message: error.message, code: error.code } });
    return;
  }

  logger.error({ error }, "Unhandled error");
  const message = error instanceof Error ? error.message : "Internal server error";
  response.status(500).json({ error: { message } });
}

export function asyncHandler<T extends (...args: any[]) => Promise<any>>(fn: T) {
  return (request: Request, response: Response, next: NextFunction) => {
    fn(request, response, next).catch(next);
  };
}
