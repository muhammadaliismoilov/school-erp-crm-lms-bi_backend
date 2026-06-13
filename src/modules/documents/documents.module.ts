import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DocumentTemplate } from './entities/document-template.entity';
import { GeneratedDocument } from './entities/generated-document.entity';
import { SignRequest } from './entities/sign-request.entity';
import { DocumentsController } from './documents.controller';
import { DocumentsService } from './documents.service';

@Module({ imports: [TypeOrmModule.forFeature([DocumentTemplate, GeneratedDocument, SignRequest])], controllers: [DocumentsController], providers: [DocumentsService], exports: [DocumentsService] })
export class DocumentsModule {}
