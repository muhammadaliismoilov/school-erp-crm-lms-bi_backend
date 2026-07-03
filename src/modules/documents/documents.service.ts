import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TenantContextService } from '../../common/tenant/tenant-context.service';
import { tenantWhere } from '../../common/tenant/tenant-scope.util';
import { CreateDocumentTemplateDto, CreateSignRequestDto, GenerateDocumentDto, UpdateDocumentTemplateDto, UpdateGeneratedDocumentDto, UpdateSignRequestDto } from './dto/documents.dto';
import { DocumentTemplate } from './entities/document-template.entity';
import { GeneratedDocument } from './entities/generated-document.entity';
import { SignRequest } from './entities/sign-request.entity';
import { DocumentStatus, SignStatus } from './enums/documents.enums';

@Injectable()
export class DocumentsService {
  constructor(
    @InjectRepository(DocumentTemplate) private readonly templates: Repository<DocumentTemplate>,
    @InjectRepository(GeneratedDocument) private readonly documents: Repository<GeneratedDocument>,
    @InjectRepository(SignRequest) private readonly signRequests: Repository<SignRequest>,
    private readonly tenant: TenantContextService,
  ) {}
  findTemplates() { return this.templates.find({ where: tenantWhere<DocumentTemplate>(this.tenant, {}, { branch: true }), order: { createdAt: 'DESC' } }); }
  createTemplate(dto: CreateDocumentTemplateDto) { return this.templates.save(this.templates.create(dto)); }
  async updateTemplate(id: string, dto: UpdateDocumentTemplateDto) {
    const found = await this.templates.findOne({ where: tenantWhere<DocumentTemplate>(this.tenant, { id }, { branch: true }) });
    if (!found) throw new NotFoundException('Document template not found');
    const entity = await this.templates.preload({ id, ...dto });
    return this.templates.save(entity!);
  }
  async generate(dto: GenerateDocumentDto) {
    let content = dto.content ?? '';
    if (dto.templateId) {
      const template = await this.templates.findOne({ where: tenantWhere<DocumentTemplate>(this.tenant, { id: dto.templateId }, { branch: true }) });
      if (!template) throw new NotFoundException('Document template not found');
      content = template.body;
      for (const [key, value] of Object.entries(dto.variables ?? {})) content = content.replaceAll(`{{${key}}}`, String(value));
    }
    return this.documents.save(this.documents.create({ ...dto, content, status: DocumentStatus.GENERATED, metadata: dto.metadata ?? {} }));
  }
  findDocuments(ownerType?: string, ownerId?: string) { return this.documents.find({ where: tenantWhere<GeneratedDocument>(this.tenant, ownerType && ownerId ? { ownerType, ownerId } : {}, { branch: true }), order: { createdAt: 'DESC' } }); }
  async updateDocument(id: string, dto: UpdateGeneratedDocumentDto) {
    const found = await this.documents.findOne({ where: tenantWhere<GeneratedDocument>(this.tenant, { id }, { branch: true }) });
    if (!found) throw new NotFoundException('Generated document not found');
    const entity = await this.documents.preload({ id, ...dto });
    return this.documents.save(entity!);
  }
  createSignRequest(dto: CreateSignRequestDto) { return this.signRequests.save(this.signRequests.create({ ...dto, sentAt: new Date() })); }
  findSignRequests(documentId?: string) { return this.signRequests.find({ where: tenantWhere<SignRequest>(this.tenant, documentId ? { documentId } : {}, { branch: true }), order: { createdAt: 'DESC' } }); }
  async updateSignRequest(id: string, dto: UpdateSignRequestDto) {
    const found = await this.signRequests.findOne({ where: tenantWhere<SignRequest>(this.tenant, { id }, { branch: true }) });
    if (!found) throw new NotFoundException('Sign request not found');
    const entity = await this.signRequests.preload({ id, ...dto, signedAt: dto.status === SignStatus.SIGNED ? new Date() : undefined });
    return this.signRequests.save(entity!);
  }
}
