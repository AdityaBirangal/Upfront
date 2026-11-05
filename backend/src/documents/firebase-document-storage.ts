import type { Storage } from 'firebase-admin/storage';
import { DocumentMeta, DocumentStorage } from './document-storage.js';

type Bucket = ReturnType<Storage['bucket']>;

const PREFIX = 'documents/';

function hasCode(error: unknown, code: number) {
  return (error as { code?: unknown } | null)?.code === code;
}

// Stores documents/<hash>.pdf in a Firebase Storage bucket, with uploadedAt in its
// custom metadata. Callers must pass a validated hash.
export class FirebaseDocumentStorage extends DocumentStorage {
  constructor(private readonly bucket: Bucket) {
    super();
  }

  async put(hash: string, bytes: Buffer, meta: DocumentMeta) {
    try {
      await this.file(hash).save(bytes, {
        contentType: 'application/pdf',
        resumable: false,
        metadata: { metadata: { uploadedAt: meta.uploadedAt } },
        // Create only. A file named by its hash never needs replacing.
        preconditionOpts: { ifGenerationMatch: 0 },
      });
    } catch (error) {
      // 412: a concurrent upload stored the same bytes first.
      if (!hasCode(error, 412)) throw error;
    }
  }

  async get(hash: string) {
    try {
      const [bytes] = await this.file(hash).download();
      return bytes;
    } catch (error) {
      if (hasCode(error, 404)) return null;
      throw error;
    }
  }

  async getMeta(hash: string): Promise<DocumentMeta | null> {
    try {
      const [meta] = await this.file(hash).getMetadata();
      const uploadedAt = meta.metadata?.uploadedAt;
      return {
        size: Number(meta.size),
        uploadedAt:
          typeof uploadedAt === 'string'
            ? uploadedAt
            : String(meta.timeCreated),
      };
    } catch (error) {
      if (hasCode(error, 404)) return null;
      throw error;
    }
  }

  private file(hash: string) {
    return this.bucket.file(`${PREFIX}${hash}.pdf`);
  }
}

// Loaded only when STORAGE=firebase, so local dev and tests never touch Firebase.
export async function createFirebaseDocumentStorage(bucketName?: string) {
  const { getApps, initializeApp } = await import('firebase-admin/app');
  const { getStorage } = await import('firebase-admin/storage');
  const app = getApps()[0] ?? initializeApp();
  return new FirebaseDocumentStorage(getStorage(app).bucket(bucketName));
}
