import { randomUUID } from 'node:crypto';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentMeta, DocumentStorage } from './document-storage.js';

function isMissing(error: unknown) {
  return (error as NodeJS.ErrnoException).code === 'ENOENT';
}

// Stores data/<hash>.pdf and data/<hash>.json. Callers must pass a validated hash.
@Injectable()
export class LocalDiskStorage extends DocumentStorage {
  private readonly dir: string;

  constructor(@Inject(ConfigService) config: ConfigService) {
    super();
    this.dir = config.get('DATA_DIR') || './data';
  }

  // The metadata goes last, because its presence is what marks a document as stored.
  async put(hash: string, bytes: Buffer, meta: DocumentMeta) {
    await mkdir(this.dir, { recursive: true });
    await this.writeAtomic(`${hash}.pdf`, bytes);
    await this.writeAtomic(`${hash}.json`, JSON.stringify(meta));
  }

  async get(hash: string) {
    if (!(await this.getMeta(hash))) return null;
    return readFile(join(this.dir, `${hash}.pdf`));
  }

  async getMeta(hash: string): Promise<DocumentMeta | null> {
    try {
      const json = await readFile(join(this.dir, `${hash}.json`), 'utf8');
      return JSON.parse(json) as DocumentMeta;
    } catch (error) {
      if (isMissing(error)) return null;
      throw error;
    }
  }

  private async writeAtomic(name: string, data: Buffer | string) {
    const temp = join(this.dir, `${name}.${randomUUID()}.tmp`);
    await writeFile(temp, data);
    await rename(temp, join(this.dir, name));
  }
}
