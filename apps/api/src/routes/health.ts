import { Router, Request, Response } from "express";

export const healthRouter = Router();

healthRouter.get("/health", (_req: Request, res: Response) => {
  res.status(200).json({
    status: "ok",
    service: "epistemic-engine-api",
    timestamp: new Date().toISOString(),
    version: "0.1.0",
  });
});

