import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
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
  ) {}
  findTemplates() { return this.templates.find({ order: { createdAt: 'DESC' } }); }
  createTemplate(dto: CreateDocumentTemplateDto) { return this.templates.save(this.templates.create(dto)); }
  async updateTemplate(id: string, dto: UpdateDocumentTemplateDto) {
    const entity = await this.templates.preload({ id, ...dto });
    if (!entity) throw new NotFoundException('Document template not found');
    return this.templates.save(entity);
  }
  async generate(dto: GenerateDocumentDto) {
    let content = dto.content ?? '';
    if (dto.templateId) {
      const template = await this.templates.findOne({ where: { id: dto.templateId } });
      if (!template) throw new NotFoundException('Document template not found');
      content = template.body;
      for (const [key, value] of Object.entries(dto.variables ?? {})) content = content.replaceAll(`{{${key}}}`, String(value));
    }
    return this.documents.save(this.documents.create({ ...dto, content, status: DocumentStatus.GENERATED, metadata: dto.metadata ?? {} }));
  }
  findDocuments(ownerType?: string, ownerId?: string) { return this.documents.find({ where: ownerType && ownerId ? { ownerType, ownerId } : {}, order: { createdAt: 'DESC' } }); }
  async updateDocument(id: string, dto: UpdateGeneratedDocumentDto) {
    const entity = await this.documents.preload({ id, ...dto });
    if (!entity) throw new NotFoundException('Generated document not found');
    return this.documents.save(entity);
  }
  createSignRequest(dto: CreateSignRequestDto) { return this.signRequests.save(this.signRequests.create({ ...dto, sentAt: new Date() })); }
  findSignRequests(documentId?: string) { return this.signRequests.find({ where: documentId ? { documentId } : {}, order: { createdAt: 'DESC' } }); }
  async updateSignRequest(id: string, dto: UpdateSignRequestDto) {
    const entity = await this.signRequests.preload({ id, ...dto, signedAt: dto.status === SignStatus.SIGNED ? new Date() : undefined });
    if (!entity) throw new NotFoundException('Sign request not found');
    return this.signRequests.save(entity);
  }
}
