import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsISO8601, IsNumber, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class CreateLibraryBookDto {
  @ApiProperty() @IsString()
  title: string;

  @ApiPropertyOptional() @IsOptional() @IsString()
  author?: string;

  @ApiPropertyOptional() @IsOptional() @IsString()
  isbn?: string;

  @ApiPropertyOptional() @IsOptional() @IsString()
  category?: string;

  @ApiPropertyOptional() @IsOptional() @IsString()
  publisher?: string;

  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() @Min(0)
  publishedYear?: number;

  @ApiPropertyOptional() @IsOptional() @IsString()
  description?: string;

}
export class UpdateLibraryBookDto extends PartialType(CreateLibraryBookDto) {}

export class CreateLibraryBookCopyDto {
  @ApiProperty() @IsUUID()
  bookId: string;

  @ApiProperty() @IsString()
  barcode: string;

  @ApiProperty() @IsString()
  status: string;

  @ApiPropertyOptional() @IsOptional() @IsString()
  location?: string;

}
export class UpdateLibraryBookCopyDto extends PartialType(CreateLibraryBookCopyDto) {}

export class CreateLibraryLoanDto {
  @ApiProperty() @IsUUID()
  copyId: string;

  @ApiPropertyOptional() @IsOptional() @IsUUID()
  studentId?: string;

  @ApiPropertyOptional() @IsOptional() @IsUUID()
  staffMemberId?: string;

  @ApiProperty() @IsISO8601({ strict: true })
  loanedAt: string;

  @ApiProperty() @IsISO8601({ strict: true })
  dueDate: string;

  @ApiPropertyOptional() @IsOptional() @IsISO8601({ strict: true })
  returnedAt?: string;

  @ApiProperty() @Type(() => Number) @IsNumber({ maxDecimalPlaces: 2 }) @Min(0)
  fineAmount: number;

  @ApiProperty() @IsString()
  status: string;

}
export class UpdateLibraryLoanDto extends PartialType(CreateLibraryLoanDto) {}

export class CreateLibraryReservationDto {
  @ApiProperty() @IsUUID()
  bookId: string;

  @ApiPropertyOptional() @IsOptional() @IsUUID()
  studentId?: string;

  @ApiPropertyOptional() @IsOptional() @IsUUID()
  staffMemberId?: string;

  @ApiProperty() @IsISO8601({ strict: true })
  reservedAt: string;

  @ApiPropertyOptional() @IsOptional() @IsISO8601({ strict: true })
  expiresAt?: string;

  @ApiProperty() @IsString()
  status: string;

}
export class UpdateLibraryReservationDto extends PartialType(CreateLibraryReservationDto) {}
