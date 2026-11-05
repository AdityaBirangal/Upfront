import { createHash } from 'node:crypto';
import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { DocumentStorage } from './document-storage.js';

const HASH_FORMAT = /^0x[0-9a-f]{64}$/;
const PDF_HEADER = '%PDF-';

function reject(status: HttpStatus, error: string): never {
  throw new HttpException({ error }, status);
}

// The hash becomes a file name, so this check also stops path injection.
function assertHashFormat(hash: unknown): asserts hash is string {
  if (typeof hash !== 'string' || !HASH_FORMAT.test(hash)) {
    reject(HttpStatus.BAD_REQUEST, 'invalid_hash');
  }
}

@Injectable()
export class DocumentsService {
  constructor(private readonly storage: DocumentStorage) {}

  async upload(hash: unknown, bytes: Buffer | undefined) {
    assertHashFormat(hash);
    if (!bytes) reject(HttpStatus.BAD_REQUEST, 'missing_file');
    if (
      bytes.subarray(0, PDF_HEADER.length).toString('latin1') !== PDF_HEADER
    ) {
      reject(HttpStatus.UNSUPPORTED_MEDIA_TYPE, 'not_pdf');
    }
    const actual = `0x${createHash('sha256').update(bytes).digest('hex')}`;
    if (actual !== hash) reject(HttpStatus.BAD_REQUEST, 'hash_mismatch');

    const existing = await this.storage.getMeta(hash);
    if (existing) {
      const { size, uploadedAt } = existing;
      return { created: false, document: { hash, size, uploadedAt } };
    }

    const size = bytes.length;
    const uploadedAt = new Date().toISOString();
    await this.storage.put(hash, bytes, { size, uploadedAt, uploader: null });
    return { created: true, document: { hash, size, uploadedAt } };
  }

  async read(hash: string) {
    assertHashFormat(hash);
    return (
      (await this.storage.get(hash)) ??
      reject(HttpStatus.NOT_FOUND, 'not_found')
    );
  }
}
