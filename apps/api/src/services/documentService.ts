import { Document, CreateDocumentRequest } from "@epistemic/shared";
import crypto from "crypto";
import { DocumentStorage, defaultStorage } from "../storage/index.js";

export class DocumentService {
  private documents: Map<string, Document> = new Map();

  constructor(private storage: DocumentStorage = defaultStorage) {}

  async createDocument(
    projectId: string,
    req: CreateDocumentRequest,
    fileBuffer?: Buffer
  ): Promise<Document> {
    if (!req.fileName || typeof req.fileName !== "string" || req.fileName.trim() === "") {
      const err = new Error("File name is required");
      (err as unknown as { code: string }).code = "VALIDATION_ERROR";
      throw err;
    }

    const documentId = `doc_${crypto.randomUUID()}`;
    const now = new Date().toISOString();
    const cleanFileName = req.fileName.trim();
    const mimeType = req.mimeType || "application/pdf";
    const size = fileBuffer ? fileBuffer.length : req.size || 0;

    let storageKey = `projects/${projectId}/${documentId}-${cleanFileName}`;

    if (fileBuffer) {
      const uploadResult = await this.storage.upload(
        projectId,
        cleanFileName,
        fileBuffer,
        mimeType
      );
      storageKey = uploadResult.storageKey;
    }

    const document: Document = {
      documentId,
      projectId,
      fileName: cleanFileName,
      mimeType,
      size,
      storageKey,
      status: "UPLOADED",
      version: 1,
      createdAt: now,
      updatedAt: now,
    };

    this.documents.set(documentId, document);
    return document;
  }

  async listDocuments(projectId: string): Promise<Document[]> {
    return Array.from(this.documents.values()).filter(
      (doc) => doc.projectId === projectId
    );
  }

  async getDocument(documentId: string): Promise<Document | null> {
    return this.documents.get(documentId) || null;
  }
}

export const documentService = new DocumentService();
