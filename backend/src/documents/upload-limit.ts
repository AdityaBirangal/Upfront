import { ConfigService } from '@nestjs/config';

const DEFAULT_MAX_UPLOAD_BYTES = 5_242_880;

export function maxUploadBytes(config: ConfigService) {
  return Number(config.get('MAX_UPLOAD_BYTES')) || DEFAULT_MAX_UPLOAD_BYTES;
}
