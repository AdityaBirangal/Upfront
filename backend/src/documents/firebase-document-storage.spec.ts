import { FirebaseDocumentStorage } from './firebase-document-storage.js';

const HASH = `0x${'ab'.repeat(32)}`;

class StorageError extends Error {
  constructor(readonly code: number) {
    super(`storage error ${code}`);
  }
}

// A stand-in for a Cloud Storage bucket that honours ifGenerationMatch: 0.
function fakeBucket() {
  const objects = new Map<
    string,
    { bytes: Buffer; metadata: Record<string, string> }
  >();
  const calls: { name: string; options: unknown }[] = [];
  const bucket = {
    file: (name: string) => ({
      save: async (
        bytes: Buffer,
        options: {
          metadata: { metadata: Record<string, string> };
          preconditionOpts?: { ifGenerationMatch?: number };
        },
      ) => {
        calls.push({ name, options });
        if (
          options.preconditionOpts?.ifGenerationMatch === 0 &&
          objects.has(name)
        ) {
          throw new StorageError(412);
        }
        objects.set(name, { bytes, metadata: options.metadata.metadata });
      },
      download: async () => {
        const object = objects.get(name);
        if (!object) throw new StorageError(404);
        return [object.bytes];
      },
      getMetadata: async () => {
        const object = objects.get(name);
        if (!object) throw new StorageError(404);
        return [
          {
            size: String(object.bytes.length),
            timeCreated: '2026-01-01T00:00:00.000Z',
            metadata: object.metadata,
          },
        ];
      },
    }),
  };
  return { bucket, objects, calls };
}

function storageWith(fake: ReturnType<typeof fakeBucket>) {
  return new FirebaseDocumentStorage(
    fake.bucket as unknown as ConstructorParameters<
      typeof FirebaseDocumentStorage
    >[0],
  );
}

describe('FirebaseDocumentStorage', () => {
  const bytes = Buffer.from('%PDF-1.4 sample');
  const meta = { size: bytes.length, uploadedAt: '2026-11-06T00:00:00.000Z' };

  it('stores documents/<hash>.pdf as a create-only PDF write', async () => {
    const fake = fakeBucket();
    await storageWith(fake).put(HASH, bytes, meta);

    expect(fake.calls).toEqual([
      {
        name: `documents/${HASH}.pdf`,
        options: expect.objectContaining({
          contentType: 'application/pdf',
          metadata: { metadata: { uploadedAt: meta.uploadedAt } },
          preconditionOpts: { ifGenerationMatch: 0 },
        }),
      },
    ]);
  });

  it('round-trips the bytes and metadata', async () => {
    const storage = storageWith(fakeBucket());
    await storage.put(HASH, bytes, meta);

    expect(await storage.get(HASH)).toEqual(bytes);
    expect(await storage.getMeta(HASH)).toEqual(meta);
  });

  it('treats a concurrent duplicate write as stored', async () => {
    const storage = storageWith(fakeBucket());
    await storage.put(HASH, bytes, meta);
    await expect(storage.put(HASH, bytes, meta)).resolves.toBeUndefined();
  });

  it('returns null for a missing document', async () => {
    const storage = storageWith(fakeBucket());
    expect(await storage.get(HASH)).toBeNull();
    expect(await storage.getMeta(HASH)).toBeNull();
  });

  it('rethrows other storage errors', async () => {
    const fake = fakeBucket();
    fake.bucket.file = () => ({
      ...fakeBucket().bucket.file(''),
      getMetadata: async () => {
        throw new StorageError(403);
      },
    });
    await expect(storageWith(fake).getMeta(HASH)).rejects.toThrow(
      'storage error 403',
    );
  });
});
