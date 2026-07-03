import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpException,
  HttpStatus,
  InternalServerErrorException,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AppPermission } from '../../common/constants/permissions';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { UuidParamDto } from '../../common/dto/uuid-param.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import type { AuthenticatedUser } from '../../common/security/authenticated-user.interface';
import { ApiLocalizedErrorResponses } from '../../common/swagger/api-localized-error-responses.decorator';
import { CreateGradeRequestDto } from './dto/create-grade-request.dto';
import { GradeRequestQueryDto } from './dto/grade-request-query.dto';
import { ReviewGradeRequestDto } from './dto/review-grade-request.dto';
import { UpdateGradeRequestDto } from './dto/update-grade-request.dto';
import { GradeRequestActor, GradeRequestsService } from './grade-requests.service';
import {
  GradeRequestListResponseSchema,
  GradeRequestResponseSchema,
} from './swagger/grade-request-response.schema';

const uuidParamDocs = {
  name: 'id',
  description: 'Baho o‘zgartirish so‘rovi IDsi UUID formatida.',
  example: '4a2e4bf2-0d57-45aa-a3b2-a8c8a7a6f4d1',
};

@ApiTags('Baho o‘zgartirish so‘rovlari')
@ApiBearerAuth()
@ApiLocalizedErrorResponses({ notFound: true })
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller({ path: 'grade-requests', version: '1' })
export class GradeRequestsController {
  constructor(private readonly service: GradeRequestsService) {}

  @Get()
  @Permissions([AppPermission.GRADE_REQUESTS_READ])
  @ApiOperation({
    summary: 'Baho o‘zgartirish so‘rovlari ro‘yxati',
    description:
      'Tur (Baholash/Kurs bahosi/Choraklik baho), holat va qidiruv filterlari bilan sahifalab qaytaradi. Stat kartalar uchun statistika ham bor.',
  })
  @ApiResponse({ status: HttpStatus.OK, type: GradeRequestListResponseSchema })
  async findAll(@Query() query: GradeRequestQueryDto) {
    try {
      return await this.service.findAll(query);
    } catch (error) {
      this.handleError(error, 'So‘rovlar ro‘yxatini olishda server xatosi yuz berdi');
    }
  }

  @Post()
  @Permissions([AppPermission.GRADE_REQUESTS_CREATE])
  @ApiOperation({ summary: 'Baho o‘zgartirish so‘rovi yaratish' })
  @ApiResponse({ status: HttpStatus.CREATED, type: GradeRequestResponseSchema })
  async create(
    @Body() dto: CreateGradeRequestDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
  ) {
    try {
      return await this.service.create(dto, this.buildActor(user, request));
    } catch (error) {
      this.handleError(error, 'So‘rov yaratishda server xatosi yuz berdi');
    }
  }

  @Get(':id')
  @Permissions([AppPermission.GRADE_REQUESTS_READ])
  @ApiOperation({ summary: 'So‘rovni ID bo‘yicha olish' })
  @ApiParam(uuidParamDocs)
  @ApiResponse({ status: HttpStatus.OK, type: GradeRequestResponseSchema })
  async findOne(@Param() params: UuidParamDto) {
    try {
      return await this.service.findOne(params.id);
    } catch (error) {
      this.handleError(error, 'So‘rovni olishda server xatosi yuz berdi');
    }
  }

  @Patch(':id')
  @Permissions([AppPermission.GRADE_REQUESTS_UPDATE])
  @ApiOperation({ summary: 'So‘rovni qisman tahrirlash (faqat kutilmoqda)' })
  @ApiParam(uuidParamDocs)
  @ApiResponse({ status: HttpStatus.OK, type: GradeRequestResponseSchema })
  async update(
    @Param() params: UuidParamDto,
    @Body() dto: UpdateGradeRequestDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
  ) {
    try {
      return await this.service.update(params.id, dto, this.buildActor(user, request));
    } catch (error) {
      this.handleError(error, 'So‘rovni tahrirlashda server xatosi yuz berdi');
    }
  }

  @Patch(':id/review')
  @Permissions([AppPermission.GRADE_REQUESTS_UPDATE])
  @ApiOperation({
    summary: 'So‘rovni tasdiqlash yoki rad etish',
    description: 'Tasdiqlanganda tegishli baho yozuvi yangilanadi. Rad etishda izoh majburiy.',
  })
  @ApiParam(uuidParamDocs)
  @ApiResponse({ status: HttpStatus.OK, type: GradeRequestResponseSchema })
  async review(
    @Param() params: UuidParamDto,
    @Body() dto: ReviewGradeRequestDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
  ) {
    try {
      return await this.service.review(params.id, dto, this.buildActor(user, request));
    } catch (error) {
      this.handleError(error, 'So‘rovni ko‘rib chiqishda server xatosi yuz berdi');
    }
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Permissions([AppPermission.GRADE_REQUESTS_DELETE])
  @ApiOperation({ summary: 'So‘rovni arxivlash (soft-delete)' })
  @ApiParam(uuidParamDocs)
  @ApiResponse({ status: HttpStatus.NO_CONTENT })
  async remove(
    @Param() params: UuidParamDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
  ) {
    try {
      await this.service.remove(params.id, this.buildActor(user, request));
    } catch (error) {
      this.handleError(error, 'So‘rovni arxivlashda server xatosi yuz berdi');
    }
  }

  private buildActor(user: AuthenticatedUser, request: Request): GradeRequestActor {
    return { userId: user?.id, ipAddress: request?.ip };
  }

  private handleError(error: unknown, fallbackMessage: string): never {
    if (error instanceof HttpException) {
      throw error;
    }
    throw new InternalServerErrorException(fallbackMessage);
  }
}
