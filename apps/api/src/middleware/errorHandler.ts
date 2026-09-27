import { Request, Response, NextFunction } from "express";

export interface CustomError extends Error {
  code?: string;
  statusCode?: number;
  details?: unknown;
}

export function errorHandler(
  err: CustomError,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  let statusCode = err.statusCode || 500;
  let code = err.code || "INTERNAL_ERROR";

  if (code === "VALIDATION_ERROR" && statusCode === 500) {
    statusCode = 400;
  } else if (code === "NOT_FOUND" && statusCode === 500) {
    statusCode = 404;
  } else if (code === "NOT_IMPLEMENTED" && statusCode === 500) {
    statusCode = 501;
  } else if (code === "UNAUTHORIZED" && statusCode === 500) {
    statusCode = 401;
  }

  // Never expose raw stack traces to the client in production or development API responses
  res.status(statusCode).json({
    error: {
      code,
      message: err.message || "An unexpected error occurred",
      ...(err.details ? { details: err.details } : {}),
    },
  });
}

