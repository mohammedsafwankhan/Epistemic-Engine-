import {
  Project,
  CreateProjectRequest,
  HealthResponse,
  ApiResponse,
  ApiError,
  Document,
  CreateDocumentRequest,
  ProcessGraph,
  Contradiction,
  Unknown,
  Fact,
  AnalysisSummary,
  SimulationResult,
  RiskAnalysisResult,
  CounterfactualChange,
  CounterfactualResult,
  WhatWouldHaveToBeTrueResult,
  AdversaryAuditReport,
} from "@epistemic/shared";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export class ApiClientError extends Error {
  code: string;
  statusCode: number;
  details?: unknown;

  constructor(error: ApiError, statusCode: number) {
    super(error.message);
    this.name = "ApiClientError";
    this.code = error.code;
    this.statusCode = statusCode;
    this.details = error.details;
  }
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  const headers = {
    "Content-Type": "application/json",
    ...options.headers,
  };

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      if (data && data.error) {
        throw new ApiClientError(data.error, response.status);
      }
      throw new ApiClientError(
        {
          code: "INTERNAL_ERROR",
          message: `Request failed with status ${response.status}`,
        },
        response.status
      );
    }

    return data as T;
  } catch (err: unknown) {
    if (err instanceof ApiClientError) {
      throw err;
    }
    throw new ApiClientError(
      {
        code: "INTERNAL_ERROR",
        message:
          err instanceof Error
            ? `Cannot connect to API at ${API_BASE_URL}: ${err.message}`
            : "Network error",
      },
      0
    );
  }
}

export const api = {
  async getHealth(): Promise<HealthResponse> {
    return request<HealthResponse>("/health");
  },

  async createProject(data: CreateProjectRequest): Promise<Project> {
    return request<Project>("/projects", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  async listProjects(): Promise<Project[]> {
    const res = await request<ApiResponse<Project[]>>("/projects");
    return res.data || [];
  },

  async getProject(id: string): Promise<Project> {
    const res = await request<ApiResponse<Project>>(`/projects/${id}`);
    if (!res.data) {
      throw new ApiClientError(
        { code: "NOT_FOUND", message: "Project data not found" },
        404
      );
    }
    return res.data;
  },

  async listDocuments(projectId: string): Promise<Document[]> {
    const res = await request<ApiResponse<Document[]>>(
      `/projects/${projectId}/documents`
    );
    return res.data || [];
  },

  async createDocument(
    projectId: string,
    data: CreateDocumentRequest
  ): Promise<Document> {
    const res = await request<ApiResponse<Document>>(
      `/projects/${projectId}/documents`,
      {
        method: "POST",
        body: JSON.stringify(data),
      }
    );
    if (!res.data) {
      throw new ApiClientError(
        { code: "INTERNAL_ERROR", message: "Failed to create document" },
        500
      );
    }
    return res.data;
  },

  async uploadDocument(projectId: string, file: File): Promise<Document> {
    const formData = new FormData();
    formData.append("file", file);

    const url = `${API_BASE_URL}/projects/${projectId}/documents/upload`;
    const response = await fetch(url, {
      method: "POST",
      body: formData,
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      if (data && data.error) {
        throw new ApiClientError(data.error, response.status);
      }
      throw new ApiClientError(
        {
          code: "INTERNAL_ERROR",
          message: `Upload failed with status ${response.status}`,
        },
        response.status
      );
    }

    return data.data as Document;
  },

  async runAnalysis(projectId: string): Promise<AnalysisSummary> {
    const res = await request<ApiResponse<AnalysisSummary>>(
      `/projects/${projectId}/analyze`,
      {
        method: "POST",
      }
    );
    if (!res.data) {
      throw new ApiClientError(
        { code: "INTERNAL_ERROR", message: "Failed to analyze project" },
        500
      );
    }
    return res.data;
  },

  async getGraph(projectId: string): Promise<ProcessGraph> {
    const res = await request<ApiResponse<ProcessGraph>>(
      `/projects/${projectId}/graph`
    );
    return (
      res.data || {
        projectId,
        nodes: [],
        edges: [],
        evidence: [],
        version: 1,
        updatedAt: new Date().toISOString(),
      }
    );
  },

  async getContradictions(projectId: string): Promise<Contradiction[]> {
    const res = await request<ApiResponse<Contradiction[]>>(
      `/projects/${projectId}/contradictions`
    );
    return res.data || [];
  },

  async resolveContradiction(
    projectId: string,
    contradictionId: string,
    resolution: "ACCEPTED_A" | "ACCEPTED_B" | "DISPUTED" | "CUSTOM",
    notes?: string
  ): Promise<Contradiction> {
    const res = await request<ApiResponse<Contradiction>>(
      `/projects/${projectId}/contradictions/${contradictionId}/resolve`,
      {
        method: "POST",
        body: JSON.stringify({ resolution, notes }),
      }
    );
    if (!res.data) {
      throw new ApiClientError(
        { code: "INTERNAL_ERROR", message: "Failed to record resolution" },
        500
      );
    }
    return res.data;
  },

  async getUnknowns(projectId: string): Promise<Unknown[]> {
    const res = await request<ApiResponse<Unknown[]>>(
      `/projects/${projectId}/unknowns`
    );
    return res.data || [];
  },

  async getFacts(projectId: string): Promise<Fact[]> {
    const res = await request<ApiResponse<Fact[]>>(
      `/projects/${projectId}/facts`
    );
    return res.data || [];
  },

  async getRisk(projectId: string): Promise<RiskAnalysisResult> {
    const res = await request<ApiResponse<RiskAnalysisResult>>(
      `/projects/${projectId}/risk`
    );
    if (!res.data) {
      throw new ApiClientError(
        { code: "INTERNAL_ERROR", message: "Failed to evaluate process risk" },
        500
      );
    }
    return res.data;
  },

  async runSimulation(
    projectId: string,
    targetDate?: string,
    iterations?: number
  ): Promise<SimulationResult> {
    const res = await request<ApiResponse<SimulationResult>>(
      `/projects/${projectId}/simulate`,
      {
        method: "POST",
        body: JSON.stringify({ targetDate, iterations }),
      }
    );
    if (!res.data) {
      throw new ApiClientError(
        { code: "INTERNAL_ERROR", message: "Failed to run simulation" },
        500
      );
    }
    return res.data;
  },

  async runCounterfactual(
    projectId: string,
    changes: CounterfactualChange[],
    targetDate?: string,
    iterations?: number
  ): Promise<CounterfactualResult> {
    const res = await request<ApiResponse<CounterfactualResult>>(
      `/projects/${projectId}/counterfactual`,
      {
        method: "POST",
        body: JSON.stringify({ changes, targetDate, iterations }),
      }
    );
    if (!res.data) {
      throw new ApiClientError(
        { code: "INTERNAL_ERROR", message: "Failed to run counterfactual evaluation" },
        500
      );
    }
    return res.data;
  },

  async getWhatWouldHaveToBeTrue(
    projectId: string,
    targetDate?: string
  ): Promise<WhatWouldHaveToBeTrueResult> {
    const query = targetDate ? `?targetDate=${encodeURIComponent(targetDate)}` : "";
    const res = await request<ApiResponse<WhatWouldHaveToBeTrueResult>>(
      `/projects/${projectId}/what-would-have-to-be-true${query}`
    );
    if (!res.data) {
      throw new ApiClientError(
        { code: "INTERNAL_ERROR", message: "Failed to evaluate conditions" },
        500
      );
    }
    return res.data;
  },

  async getAdversaryAudit(projectId: string): Promise<AdversaryAuditReport> {
    const res = await request<ApiResponse<AdversaryAuditReport>>(
      `/projects/${projectId}/adversary`
    );
    if (!res.data) {
      throw new ApiClientError(
        { code: "INTERNAL_ERROR", message: "Failed to retrieve adversary audit" },
        500
      );
    }
    return res.data;
  },
};
