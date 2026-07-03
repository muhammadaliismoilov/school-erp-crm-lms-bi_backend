import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'crypto';
import { Repository } from 'typeorm';
import { TenantContextService } from '../../common/tenant/tenant-context.service';
import { tenantWhere } from '../../common/tenant/tenant-scope.util';
import { ObjectStorageService } from '../storage/object-storage.service';
import { StoredFile } from './entities/stored-file.entity';

interface StoreFileInput {
  fileName: string;
  mimeType: string;
  size: number;
  body: Buffer | Uint8Array | string;
  uploadedById?: string;
}

@Injectable()
export class FileStorageService {
  constructor(
    @InjectRepository(StoredFile)
    private readonly files: Repository<StoredFile>,
    private readonly objectStorage: ObjectStorageService,
    private readonly tenant: TenantContextService,
  ) {}

  async storeFile(input: StoreFileInput): Promise<StoredFile> {
    const storageKey = this.buildStorageKey(input.fileName);
    const storedObject = await this.objectStorage.putObject({
      key: storageKey,
      body: input.body,
      contentType: input.mimeType,
    });

    return this.files.save(
      this.files.create({
        fileName: input.fileName,
        mimeType: input.mimeType,
        size: input.size,
        storageKey: storedObject.key,
        fileUrl: storedObject.url,
        uploadedById: input.uploadedById,
      }),
    );
  }

  async findFile(id: string): Promise<StoredFile> {
    // Fayllar maktab darajasida ajratiladi (filial emas — umumiy resurslar).
    const file = await this.files.findOne({ where: tenantWhere<StoredFile>(this.tenant, { id }) });
    if (!file) {
      throw new NotFoundException('File not found');
    }

    return file;
  }

  async deleteFile(id: string): Promise<void> {
    const file = await this.findFile(id);
    await this.objectStorage.deleteObject(file.storageKey);
    await this.files.softDelete(id);
  }

  private buildStorageKey(fileName: string): string {
    const safeName = fileName.replace(/[^A-Za-z0-9._-]/g, '-').replace(/-+/g, '-');
    return (
      'uploads/' +
      new Date().toISOString().slice(0, 10) +
      '/' +
      randomUUID() +
      '-' +
      safeName
    );
  }
}
