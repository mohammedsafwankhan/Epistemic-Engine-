/**
 * Storage Abstraction Boundary
 * Defines DocumentStorage interface and development-ready implementations.
 */

export interface StorageUploadResult {
  storageKey: string;
  url?: string;
  size: number;
}

export interface DocumentStorage {
  upload(projectId: string, fileName: string, content: Buffer, mimeType: string): Promise<StorageUploadResult>;
  get(storageKey: string): Promise<Buffer | null>;
  delete(storageKey: string): Promise<boolean>;
  getSignedUrl(storageKey: string, expiresInSeconds?: number): Promise<string>;
}

/**
 * MemoryStorage: Safe in-memory/mock storage for local development and testing
 * when AWS credentials are not configured.
 */
export class MemoryDocumentStorage implements DocumentStorage {
  private files: Map<string, { buffer: Buffer; mimeType: string }> = new Map();

  async upload(projectId: string, fileName: string, content: Buffer, mimeType: string): Promise<StorageUploadResult> {
    const storageKey = `projects/${projectId}/${Date.now()}-${fileName}`;
    this.files.set(storageKey, { buffer: content, mimeType });
    return {
      storageKey,
      size: content.length,
      url: `local://${storageKey}`,
    };
  }

  async get(storageKey: string): Promise<Buffer | null> {
    const item = this.files.get(storageKey);
    return item ? item.buffer : null;
  }

  async delete(storageKey: string): Promise<boolean> {
    return this.files.delete(storageKey);
  }

  async getSignedUrl(storageKey: string, _expiresInSeconds = 3600): Promise<string> {
    if (!this.files.has(storageKey)) {
      throw new Error(`Storage key not found: ${storageKey}`);
    }
    return `http://localhost:3001/storage/mock/${encodeURIComponent(storageKey)}`;
  }
}

/**
 * S3DocumentStorage: Boundary adapter for AWS S3.
 * Configured in later phases when live AWS infrastructure is provisioned.
 */
export class S3DocumentStorage implements DocumentStorage {
  private bucket: string;
  private region: string;

  constructor(bucket: string, region: string) {
    this.bucket = bucket;
    this.region = region;
  }

  async upload(projectId: string, fileName: string, content: Buffer, _mimeType: string): Promise<StorageUploadResult> {
    // S3 client integration boundary
    const storageKey = `projects/${projectId}/${Date.now()}-${fileName}`;
    return {
      storageKey,
      size: content.length,
      url: `https://${this.bucket}.s3.${this.region}.amazonaws.com/${storageKey}`,
    };
  }

  async get(_storageKey: string): Promise<Buffer | null> {
    return null; // S3 boundary placeholder
  }

  async delete(_storageKey: string): Promise<boolean> {
    return true; // S3 boundary placeholder
  }

  async getSignedUrl(storageKey: string, _expiresInSeconds = 3600): Promise<string> {
    return `https://${this.bucket}.s3.${this.region}.amazonaws.com/${storageKey}?signature-placeholder`;
  }
}

// Export default instance
export const defaultStorage: DocumentStorage = new MemoryDocumentStorage();

