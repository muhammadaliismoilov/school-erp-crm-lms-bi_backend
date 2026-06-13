import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AppPermission } from '../../common/constants/permissions';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { UuidParamDto } from '../../common/dto/uuid-param.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { CreateDocumentTemplateDto, CreateSignRequestDto, GenerateDocumentDto, UpdateDocumentTemplateDto, UpdateGeneratedDocumentDto, UpdateSignRequestDto } from './dto/documents.dto';
import { DocumentsService } from './documents.service';

@ApiTags('Documents') @ApiBearerAuth() @UseGuards(JwtAuthGuard, PermissionsGuard) @Controller({ path: 'documents', version: '1' })
export class DocumentsController {
  constructor(private readonly service: DocumentsService) {}
  @Get('templates') @Permissions([AppPermission.DOCUMENTS_READ]) findTemplates() { return this.service.findTemplates(); }
  @Post('templates') @Permissions([AppPermission.DOCUMENTS_MANAGE]) createTemplate(@Body() dto: CreateDocumentTemplateDto) { return this.service.createTemplate(dto); }
  @Patch('templates/:id') @Permissions([AppPermission.DOCUMENTS_MANAGE]) updateTemplate(@Param() p: UuidParamDto, @Body() dto: UpdateDocumentTemplateDto) { return this.service.updateTemplate(p.id, dto); }
  @Get() @Permissions([AppPermission.DOCUMENTS_READ]) findDocuments(@Query('ownerType') ownerType?: string, @Query('ownerId') ownerId?: string) { return this.service.findDocuments(ownerType, ownerId); }
  @Post('generate') @Permissions([AppPermission.DOCUMENTS_MANAGE]) generate(@Body() dto: GenerateDocumentDto) { return this.service.generate(dto); }
  @Patch(':id') @Permissions([AppPermission.DOCUMENTS_MANAGE]) updateDocument(@Param() p: UuidParamDto, @Body() dto: UpdateGeneratedDocumentDto) { return this.service.updateDocument(p.id, dto); }
  @Get('sign-requests/list') @Permissions([AppPermission.DOCUMENTS_READ]) findSignRequests(@Query('documentId') documentId?: string) { return this.service.findSignRequests(documentId); }
  @Post('sign-requests') @Permissions([AppPermission.DOCUMENTS_MANAGE]) createSignRequest(@Body() dto: CreateSignRequestDto) { return this.service.createSignRequest(dto); }
  @Patch('sign-requests/:id') @Permissions([AppPermission.DOCUMENTS_MANAGE]) updateSignRequest(@Param() p: UuidParamDto, @Body() dto: UpdateSignRequestDto) { return this.service.updateSignRequest(p.id, dto); }
}
