import { DeleteObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { mkdir, rm, writeFile } from 'fs/promises';
import { dirname, join, resolve } from 'path';
import { Readable } from 'stream';

interface PutObjectInput {
  key: string;
  body: Buffer | Uint8Array | string | Readable;
  contentType: string;
}

type StorageDriver = 'local' | 's3';

@Injectable()
export class ObjectStorageService {
  private readonly logger = new Logger(ObjectStorageService.name);
  private readonly driver: StorageDriver;
  private readonly publicBaseUrl?: string;

  // Local driver
  private readonly localDir: string;

  // S3 driver
  private readonly client?: S3Client;
  private readonly bucket?: string;

  constructor(configService: ConfigService) {
    this.driver = configService.get<StorageDriver>('storage.driver') ?? 'local';
    this.publicBaseUrl = configService.get<string>('storage.publicBaseUrl');
    this.localDir = resolve(
      configService.get<string>('storage.localDir') ?? resolve(process.cwd(), 'storage'),
    );

    if (this.driver === 's3') {
      this.bucket = configService.getOrThrow<string>('storage.bucket');
      this.client = new S3Client({
        endpoint: configService.getOrThrow<string>('storage.endpoint'),
        region: configService.getOrThrow<string>('storage.region'),
        forcePathStyle: configService.get<boolean>('storage.forcePathStyle') ?? true,
        credentials: {
          accessKeyId: configService.getOrThrow<string>('storage.accessKeyId'),
          secretAccessKey: configService.getOrThrow<string>('storage.secretAccessKey'),
        },
      });
    } else {
      this.logger.log(`Storage driver: local (${this.localDir})`);
    }
  }

  async putObject(input: PutObjectInput): Promise<{ key: string; url?: string }> {
    if (this.driver === 'local') {
      await this.writeLocal(input.key, input.body);
    } else {
      await this.client!.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: input.key,
          Body: input.body,
          ContentType: input.contentType,
        }),
      );
    }

    return {
      key: input.key,
      url: this.getPublicUrl(input.key),
    };
  }

  async deleteObject(key: string): Promise<void> {
    if (this.driver === 'local') {
      await rm(this.localPath(key), { force: true });
      return;
    }

    await this.client!.send(
      new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: key,
      }),
    );
  }

  getPublicUrl(key: string): string | undefined {
    if (!this.publicBaseUrl) {
      return undefined;
    }

    return this.publicBaseUrl.replace(/\/$/, '') + '/' + encodeURI(key);
  }

  private localPath(key: string): string {
    // Prevent path traversal: resolve and ensure the result stays under localDir.
    const fullPath = resolve(join(this.localDir, key));
    if (fullPath !== this.localDir && !fullPath.startsWith(this.localDir + '/')) {
      throw new Error('Invalid storage key');
    }
    return fullPath;
  }

  private async writeLocal(
    key: string,
    body: Buffer | Uint8Array | string | Readable,
  ): Promise<void> {
    const fullPath = this.localPath(key);
    await mkdir(dirname(fullPath), { recursive: true });
    const data = body instanceof Readable ? await this.streamToBuffer(body) : body;
    await writeFile(fullPath, data);
  }

  private async streamToBuffer(stream: Readable): Promise<Buffer> {
    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk as ArrayBuffer));
    }
    return Buffer.concat(chunks);
  }
}
