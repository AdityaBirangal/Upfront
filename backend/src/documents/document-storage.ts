export interface DocumentMeta {
  size: number;
  uploadedAt: string;
  uploader: string | null; // set from V2, when uploads are signed
}

// Abstract class rather than interface, so it can also be the Nest injection token.
export abstract class DocumentStorage {
  abstract put(hash: string, bytes: Buffer, meta: DocumentMeta): Promise<void>;
  abstract get(hash: string): Promise<Buffer | null>;
  abstract getMeta(hash: string): Promise<DocumentMeta | null>;
}
