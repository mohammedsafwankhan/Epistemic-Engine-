import { Router, Request, Response, NextFunction } from "express";
import multer from "multer";
import { projectService } from "../services/projectService.js";
import { documentService } from "../services/documentService.js";
import { analysisService } from "../services/analysisService.js";
import { analysisPipeline } from "../engine/pipeline.js";
import { calculateCriticalPath } from "../engine/criticalPathEngine.js";
import { runMonteCarloSimulation } from "../engine/monteCarloSimulator.js";
import { evaluateCounterfactualScenario } from "../engine/counterfactualEngine.js";
import { evaluateWhatWouldHaveToBeTrue } from "../engine/backwardChainingEngine.js";
import { runAdversaryAudit } from "../engine/adversaryAgent.js";
import {
  CreateProjectRequest,
  CreateDocumentRequest,
  CounterfactualChange,
  RiskAnalysisResult,
  ContradictionResolution,
} from "@epistemic/shared";

// Memory storage for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB max
});

export const projectsRouter = Router();

// ==========================================
// 1. Projects Core Endpoints
// ==========================================

projectsRouter.post("/projects", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = req.body as CreateProjectRequest;
    const project = await projectService.createProject(body);
    res.status(201).json({
      id: project.id,
      name: project.name,
      processType: project.processType,
      description: project.description,
      status: project.status,
      documentCount: project.documentCount,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
    });
  } catch (error) {
    next(error);
  }
});

projectsRouter.get("/projects", async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const projects = await projectService.listProjects();
    res.status(200).json({ data: projects });
  } catch (error) {
    next(error);
  }
});

projectsRouter.get("/projects/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const project = await projectService.getProject(req.params.id);
    res.status(200).json({ data: project });
  } catch (error) {
    next(error);
  }
});

// ==========================================
// 2. Document Endpoints
// ==========================================

projectsRouter.post("/projects/:id/documents", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const projectId = req.params.id;
    await projectService.getProject(projectId);

    const body = req.body as CreateDocumentRequest;
    const document = await documentService.createDocument(projectId, body);
    await projectService.incrementDocumentCount(projectId);

    res.status(201).json({ data: document });
  } catch (error) {
    next(error);
  }
});

projectsRouter.post(
  "/projects/:id/documents/upload",
  upload.single("file"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const projectId = req.params.id;
      await projectService.getProject(projectId);

      if (!req.file) {
        const err = new Error("File is required in multipart upload");
        (err as unknown as { code: string }).code = "VALIDATION_ERROR";
        throw err;
      }

      const document = await documentService.createDocument(
        projectId,
        {
          fileName: req.file.originalname,
          mimeType: req.file.mimetype,
          size: req.file.size,
        },
        req.file.buffer
      );

      await projectService.incrementDocumentCount(projectId);
      res.status(201).json({ data: document });
    } catch (error) {
      next(error);
    }
  }
);

projectsRouter.get("/projects/:id/documents", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const projectId = req.params.id;
    await projectService.getProject(projectId);

    const documents = await documentService.listDocuments(projectId);
    res.status(200).json({ data: documents });
  } catch (error) {
    next(error);
  }
});

// ==========================================
// 3. Analysis, Graph, Unknowns, Contradictions & Facts
// ==========================================

projectsRouter.post("/projects/:id/analyze", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const projectId = req.params.id;
    const project = await projectService.getProject(projectId);

    const result = await analysisPipeline.run(projectId);
    analysisService.saveAnalysis(projectId, result);

    project.status = "ANALYZED";
    await projectService.incrementDocumentCount(projectId);

    res.status(200).json({
      data: result.summary,
    });
  } catch (error) {
    next(error);
  }
});

projectsRouter.get("/projects/:id/graph", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const projectId = req.params.id;
    await projectService.getProject(projectId);

    const graph = analysisService.getGraph(projectId);
    if (!graph) {
      res.status(200).json({
        data: {
          projectId,
          nodes: [],
          edges: [],
          evidence: [],
          version: 1,
          updatedAt: new Date().toISOString(),
        },
      });
      return;
    }

    res.status(200).json({ data: graph });
  } catch (error) {
    next(error);
  }
});

projectsRouter.get("/projects/:id/unknowns", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const projectId = req.params.id;
    await projectService.getProject(projectId);

    const unknowns = analysisService.getUnknowns(projectId);
    res.status(200).json({ data: unknowns });
  } catch (error) {
    next(error);
  }
});

projectsRouter.get("/projects/:id/contradictions", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const projectId = req.params.id;
    await projectService.getProject(projectId);

    const contradictions = analysisService.getContradictions(projectId);
    res.status(200).json({ data: contradictions });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /projects/:id/contradictions/:contradictionId/resolve
 * Record user contradiction resolution decision
 */
projectsRouter.post(
  "/projects/:id/contradictions/:contradictionId/resolve",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id: projectId, contradictionId } = req.params;
      await projectService.getProject(projectId);

      const body = req.body as {
        resolution: "ACCEPTED_A" | "ACCEPTED_B" | "DISPUTED" | "CUSTOM";
        selectedEvidenceId?: string;
        notes?: string;
      };

      if (!body.resolution) {
        const err = new Error("Resolution choice ('ACCEPTED_A', 'ACCEPTED_B', or 'DISPUTED') is required");
        (err as unknown as { code: string }).code = "VALIDATION_ERROR";
        throw err;
      }

      const resolutionData: ContradictionResolution = {
        resolution: body.resolution,
        selectedEvidenceId: body.selectedEvidenceId,
        notes: body.notes,
        resolvedAt: new Date().toISOString(),
      };

      const updated = analysisService.resolveContradiction(
        projectId,
        contradictionId,
        resolutionData
      );

      if (!updated) {
        const err = new Error(`Contradiction '${contradictionId}' not found`);
        (err as unknown as { code: string }).code = "NOT_FOUND";
        throw err;
      }

      res.status(200).json({ data: updated });
    } catch (error) {
      next(error);
    }
  }
);

projectsRouter.get("/projects/:id/facts", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const projectId = req.params.id;
    await projectService.getProject(projectId);

    const facts = analysisService.getFacts(projectId);
    res.status(200).json({ data: facts });
  } catch (error) {
    next(error);
  }
});

// ==========================================
// 4. Intelligence, Risk & Counterfactual
// ==========================================

projectsRouter.get("/projects/:id/risk", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const projectId = req.params.id;
    await projectService.getProject(projectId);

    let graph = analysisService.getGraph(projectId);
    if (!graph || graph.nodes.length === 0) {
      const docs = await documentService.listDocuments(projectId);
      if (docs.length > 0) {
        const result = await analysisPipeline.run(projectId);
        analysisService.saveAnalysis(projectId, result);
        graph = result.graph;
      }
    }

    if (!graph || graph.nodes.length === 0) {
      const err = new Error("Cannot evaluate risk without project documents or analyzed graph");
      (err as unknown as { code: string }).code = "VALIDATION_ERROR";
      throw err;
    }

    const unknowns = analysisService.getUnknowns(projectId);
    const contradictions = analysisService.getContradictions(projectId);
    const simulation = runMonteCarloSimulation(projectId, graph);

    const topRiskFactors: string[] = [];
    if (contradictions.filter((c) => c.status !== "RESOLVED").length > 0) {
      topRiskFactors.push(`${contradictions.filter((c) => c.status !== "RESOLVED").length} unresolved document policy contradictions detected`);
    }
    if (unknowns.some((u) => u.blocking)) {
      topRiskFactors.push("Blocking unknowns identified regarding authorization or deadlines");
    }
    if (simulation.probabilityOfDeadlineMiss > 0.3) {
      topRiskFactors.push(`Critical path duration variance introduces ${(simulation.probabilityOfDeadlineMiss * 100).toFixed(0)}% miss risk`);
    }

    const riskResult: RiskAnalysisResult = {
      projectId,
      targetDeadline: simulation.targetDate,
      probabilityOfMiss: simulation.probabilityOfDeadlineMiss,
      probabilityOfSuccess: simulation.probabilityOfSuccess,
      expectedCompletionDate: simulation.expectedCompletionDate,
      expectedCompletionDays: simulation.expectedCompletionDays,
      criticalPath: simulation.criticalPath,
      blockingUnknowns: unknowns.filter((u) => u.blocking),
      topRiskFactors: topRiskFactors.length > 0 ? topRiskFactors : ["Standard timeline variance"],
      assumptions: simulation.assumptions,
    };

    res.status(200).json({ data: riskResult });
  } catch (error) {
    next(error);
  }
});

projectsRouter.post("/projects/:id/simulate", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const projectId = req.params.id;
    await projectService.getProject(projectId);

    let graph = analysisService.getGraph(projectId);
    if (!graph || graph.nodes.length === 0) {
      const docs = await documentService.listDocuments(projectId);
      if (docs.length > 0) {
        const result = await analysisPipeline.run(projectId);
        analysisService.saveAnalysis(projectId, result);
        graph = result.graph;
      }
    }

    if (!graph || graph.nodes.length === 0) {
      const err = new Error("Cannot run simulation without project documents");
      (err as unknown as { code: string }).code = "VALIDATION_ERROR";
      throw err;
    }

    const { targetDate, iterations } = req.body as {
      targetDate?: string;
      iterations?: number;
    };

    const simResult = runMonteCarloSimulation(
      projectId,
      graph,
      targetDate,
      iterations || 5000
    );

    res.status(200).json({ data: simResult });
  } catch (error) {
    next(error);
  }
});

projectsRouter.post("/projects/:id/counterfactual", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const projectId = req.params.id;
    await projectService.getProject(projectId);

    let graph = analysisService.getGraph(projectId);
    if (!graph || graph.nodes.length === 0) {
      const docs = await documentService.listDocuments(projectId);
      if (docs.length > 0) {
        const result = await analysisPipeline.run(projectId);
        analysisService.saveAnalysis(projectId, result);
        graph = result.graph;
      }
    }

    if (!graph || graph.nodes.length === 0) {
      const err = new Error("Cannot run counterfactual evaluation without project documents");
      (err as unknown as { code: string }).code = "VALIDATION_ERROR";
      throw err;
    }

    const { changes, targetDate, iterations } = req.body as {
      changes: CounterfactualChange[];
      targetDate?: string;
      iterations?: number;
    };

    if (!Array.isArray(changes) || changes.length === 0) {
      const err = new Error("At least one counterfactual change is required");
      (err as unknown as { code: string }).code = "VALIDATION_ERROR";
      throw err;
    }

    const counterResult = evaluateCounterfactualScenario(
      projectId,
      graph,
      changes,
      targetDate,
      iterations || 5000
    );

    res.status(200).json({ data: counterResult });
  } catch (error) {
    next(error);
  }
});

projectsRouter.get("/projects/:id/what-would-have-to-be-true", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const projectId = req.params.id;
    await projectService.getProject(projectId);

    let graph = analysisService.getGraph(projectId);
    if (!graph || graph.nodes.length === 0) {
      const docs = await documentService.listDocuments(projectId);
      if (docs.length > 0) {
        const result = await analysisPipeline.run(projectId);
        analysisService.saveAnalysis(projectId, result);
        graph = result.graph;
      }
    }

    if (!graph || graph.nodes.length === 0) {
      const err = new Error("Cannot evaluate conditions without project documents");
      (err as unknown as { code: string }).code = "VALIDATION_ERROR";
      throw err;
    }

    const contradictions = analysisService.getContradictions(projectId);
    const unknowns = analysisService.getUnknowns(projectId);
    const targetDate = req.query.targetDate as string | undefined;

    const result = evaluateWhatWouldHaveToBeTrue(
      projectId,
      graph,
      contradictions,
      unknowns,
      targetDate
    );

    res.status(200).json({ data: result });
  } catch (error) {
    next(error);
  }
});

// ==========================================
// 5. Phase 4: Adversary Validation Agent Endpoints
// ==========================================

/**
 * GET & POST /projects/:id/adversary
 * Generates an adversarial challenge report attacking process graph reasoning
 */
projectsRouter.get("/projects/:id/adversary", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const projectId = req.params.id;
    await projectService.getProject(projectId);

    let report = analysisService.getAdversaryReport(projectId);
    if (!report) {
      let graph = analysisService.getGraph(projectId);
      if (!graph || graph.nodes.length === 0) {
        const docs = await documentService.listDocuments(projectId);
        if (docs.length > 0) {
          const result = await analysisPipeline.run(projectId);
          analysisService.saveAnalysis(projectId, result);
          graph = result.graph;
        }
      }

      if (!graph || graph.nodes.length === 0) {
        const err = new Error("Cannot run adversary audit without project documents");
        (err as unknown as { code: string }).code = "VALIDATION_ERROR";
        throw err;
      }

      const contradictions = analysisService.getContradictions(projectId);
      const unknowns = analysisService.getUnknowns(projectId);
      const cpm = calculateCriticalPath(graph);

      report = runAdversaryAudit(
        projectId,
        graph,
        contradictions,
        unknowns,
        cpm.criticalPath,
        cpm.assumptions
      );
      analysisService.saveAdversaryReport(projectId, report);
    }

    res.status(200).json({ data: report });
  } catch (error) {
    next(error);
  }
});

projectsRouter.post("/projects/:id/adversary/audit", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const projectId = req.params.id;
    await projectService.getProject(projectId);

    let graph = analysisService.getGraph(projectId);
    if (!graph || graph.nodes.length === 0) {
      const docs = await documentService.listDocuments(projectId);
      if (docs.length > 0) {
        const result = await analysisPipeline.run(projectId);
        analysisService.saveAnalysis(projectId, result);
        graph = result.graph;
      }
    }

    if (!graph || graph.nodes.length === 0) {
      const err = new Error("Cannot run adversary audit without project documents");
      (err as unknown as { code: string }).code = "VALIDATION_ERROR";
      throw err;
    }

    const contradictions = analysisService.getContradictions(projectId);
    const unknowns = analysisService.getUnknowns(projectId);
    const cpm = calculateCriticalPath(graph);

    const report = runAdversaryAudit(
      projectId,
      graph,
      contradictions,
      unknowns,
      cpm.criticalPath,
      cpm.assumptions
    );
    analysisService.saveAdversaryReport(projectId, report);

    res.status(200).json({ data: report });
  } catch (error) {
    next(error);
  }
});
