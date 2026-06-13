import { registerAs } from '@nestjs/config';
import { resolve } from 'path';

/**
 * Storage driver:
 * - `local` (default): files are written to disk and served statically by the
 *   API. Works with zero external infrastructure — ideal for dev and small
 *   single-node deployments.
 * - `s3`: files go to an S3-compatible bucket (AWS S3, MinIO, etc.).
 */
const driver = (process.env.STORAGE_DRIVER ?? 'local').toLowerCase() === 's3' ? 's3' : 'local';

const port = process.env.APP_PORT ?? process.env.PORT ?? '5000';

export default registerAs('storage', () => ({
  driver,
  // Local driver
  localDir: process.env.STORAGE_LOCAL_DIR ?? resolve(process.cwd(), 'storage'),
  /** URL prefix under which the API serves uploaded files (local driver). */
  staticPrefix: '/static',
  // S3 driver
  endpoint: process.env.S3_ENDPOINT ?? 'http://localhost:9000',
  region: process.env.S3_REGION ?? 'us-east-1',
  bucket: process.env.S3_BUCKET ?? 'yuton-files',
  accessKeyId: process.env.S3_ACCESS_KEY_ID ?? 'minio',
  secretAccessKey: process.env.S3_SECRET_ACCESS_KEY ?? 'minio-password',
  forcePathStyle: process.env.S3_FORCE_PATH_STYLE !== 'false',
  /** Public base URL used to build file URLs. Falls back to the local static route. */
  publicBaseUrl:
    process.env.STORAGE_PUBLIC_BASE_URL ??
    process.env.S3_PUBLIC_BASE_URL ??
    (driver === 'local' ? `http://localhost:${port}/static` : undefined),
}));
