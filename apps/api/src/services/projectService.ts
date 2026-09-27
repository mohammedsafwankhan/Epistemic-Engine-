import { Project, CreateProjectRequest, ProcessType } from "@epistemic/shared";
import crypto from "crypto";

export interface ProjectRepository {
  create(data: CreateProjectRequest): Promise<Project>;
  getById(id: string): Promise<Project | null>;
  list(): Promise<Project[]>;
  update(project: Project): Promise<Project>;
}

/**
 * MemoryProjectRepository: In-memory store for Phase 1 development and testing.
 * Provides the identical interface that the DynamoDB repository will fulfill.
 */
export class MemoryProjectRepository implements ProjectRepository {
  private projects: Map<string, Project> = new Map();

  async create(data: CreateProjectRequest): Promise<Project> {
    const id = `proj_${crypto.randomUUID()}`;
    const now = new Date().toISOString();
    const project: Project = {
      id,
      name: data.name.trim(),
      processType: data.processType,
      description: data.description?.trim(),
      status: "DRAFT",
      documentCount: 0,
      createdAt: now,
      updatedAt: now,
    };
    this.projects.set(id, project);
    return project;
  }

  async getById(id: string): Promise<Project | null> {
    return this.projects.get(id) || null;
  }

  async list(): Promise<Project[]> {
    return Array.from(this.projects.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  async update(project: Project): Promise<Project> {
    const updated = {
      ...project,
      updatedAt: new Date().toISOString(),
    };
    this.projects.set(project.id, updated);
    return updated;
  }
}

export class ProjectService {
  constructor(private repo: ProjectRepository) {}

  async createProject(request: CreateProjectRequest): Promise<Project> {
    if (!request || !request.name || typeof request.name !== "string" || request.name.trim() === "") {
      const err = new Error("Project name is required");
      (err as unknown as { code: string }).code = "VALIDATION_ERROR";
      throw err;
    }

    const validProcessTypes: ProcessType[] = [
      "INTERNSHIP_ONBOARDING",
      "SCHOLARSHIP_APPLICATION",
      "VISA_PERMIT",
      "COMPLIANCE_WORKFLOW",
      "HEALTHCARE_ADMINISTRATION",
      "GENERIC_PROCESS",
    ];

    if (!request.processType || !validProcessTypes.includes(request.processType)) {
      const err = new Error(`Invalid process type. Must be one of: ${validProcessTypes.join(", ")}`);
      (err as unknown as { code: string }).code = "VALIDATION_ERROR";
      throw err;
    }

    return this.repo.create(request);
  }

  async getProject(id: string): Promise<Project> {
    if (!id) {
      const err = new Error("Project ID is required");
      (err as unknown as { code: string }).code = "VALIDATION_ERROR";
      throw err;
    }

    const project = await this.repo.getById(id);
    if (!project) {
      const err = new Error(`Project not found with id: ${id}`);
      (err as unknown as { code: string }).code = "NOT_FOUND";
      throw err;
    }
    return project;
  }

  async listProjects(): Promise<Project[]> {
    return this.repo.list();
  }

  async incrementDocumentCount(projectId: string): Promise<Project> {
    const project = await this.getProject(projectId);
    project.documentCount += 1;
    return this.repo.update(project);
  }
}

export const projectRepository = new MemoryProjectRepository();
export const projectService = new ProjectService(projectRepository);

