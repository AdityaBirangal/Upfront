export interface DocumentMeta {
  size: number;
  uploadedAt: string;
}

// Abstract class rather than interface, so it can also be the Nest injection token.
export abstract class DocumentStorage {
  abstract put(hash: string, bytes: Buffer, meta: DocumentMeta): Promise<void>;
  abstract get(hash: string): Promise<Buffer | null>;
  abstract getMeta(hash: string): Promise<DocumentMeta | null>;
}
