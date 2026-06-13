import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsEnum, IsObject, IsOptional, IsString, IsUUID, Length, IsArray } from 'class-validator';
import { DocumentStatus, DocumentTemplateStatus, DocumentType, SignStatus } from '../enums/documents.enums';

export class CreateDocumentTemplateDto {
  @ApiProperty() @IsString() @Length(2, 80) code: string;
  @ApiProperty() @IsString() @Length(3, 180) name: string;
  @ApiProperty({ enum: DocumentType }) @IsEnum(DocumentType) type: DocumentType;
  @ApiProperty() @IsString() @Length(10, 50000) body: string;
  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() @IsString({ each: true }) variables?: string[];
  @ApiPropertyOptional({ enum: DocumentTemplateStatus }) @IsOptional() @IsEnum(DocumentTemplateStatus) status?: DocumentTemplateStatus;
}
export class UpdateDocumentTemplateDto extends PartialType(CreateDocumentTemplateDto) {}
export class GenerateDocumentDto {
  @ApiPropertyOptional({ format: 'uuid' }) @IsOptional() @IsUUID() templateId?: string;
  @ApiProperty() @IsString() @Length(2, 80) ownerType: string;
  @ApiProperty({ format: 'uuid' }) @IsUUID() ownerId: string;
  @ApiProperty({ enum: DocumentType }) @IsEnum(DocumentType) type: DocumentType;
  @ApiProperty() @IsString() @Length(3, 220) title: string;
  @ApiPropertyOptional() @IsOptional() @IsString() content?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() fileUrl?: string;
  @ApiPropertyOptional() @IsOptional() @IsObject() variables?: Record<string, unknown>;
  @ApiPropertyOptional() @IsOptional() @IsObject() metadata?: Record<string, unknown>;
}
export class UpdateGeneratedDocumentDto {
  @ApiPropertyOptional() @IsOptional() @IsString() content?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() fileUrl?: string;
  @ApiPropertyOptional({ enum: DocumentStatus }) @IsOptional() @IsEnum(DocumentStatus) status?: DocumentStatus;
  @ApiPropertyOptional() @IsOptional() @IsObject() metadata?: Record<string, unknown>;
}
export class CreateSignRequestDto {
  @ApiProperty({ format: 'uuid' }) @IsUUID() documentId: string;
  @ApiProperty({ format: 'uuid' }) @IsUUID() signerId: string;
  @ApiProperty() @IsString() @Length(2, 80) signerType: string;
}
export class UpdateSignRequestDto {
  @ApiPropertyOptional({ enum: SignStatus }) @IsOptional() @IsEnum(SignStatus) status?: SignStatus;
  @ApiPropertyOptional() @IsOptional() @IsString() rejectReason?: string;
}
