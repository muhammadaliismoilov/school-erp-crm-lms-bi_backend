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
import { CreateParentCommDto } from './dto/create-parent-comm.dto';
import { ParentCommQueryDto } from './dto/parent-comm-query.dto';
import { UpdateParentCommDto } from './dto/update-parent-comm.dto';
import { ParentCommActor, ParentCommsService } from './parent-comms.service';
import {
  ParentCommListResponseSchema,
  ParentCommResponseSchema,
} from './swagger/parent-comm-response.schema';

const uuidParamDocs = {
  name: 'id',
  description: 'Muloqot IDsi UUID formatida.',
  example: '4a2e4bf2-0d57-45aa-a3b2-a8c8a7a6f4d1',
};

@ApiTags('Ota-onalar bilan muloqot')
@ApiBearerAuth()
@ApiLocalizedErrorResponses({ notFound: true })
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller({ path: 'parent-communications', version: '1' })
export class ParentCommsController {
  constructor(private readonly service: ParentCommsService) {}

  @Get()
  @Permissions([AppPermission.STUDENTS_READ])
  @ApiOperation({
    summary: 'Ota-ona muloqotlari ro‘yxati',
    description: 'Sentiment, sinf, yil va oy filterlari bilan sahifalab qaytaradi. Stat kartalar uchun statistika ham bor.',
  })
  @ApiResponse({ status: HttpStatus.OK, type: ParentCommListResponseSchema })
  async findAll(@Query() query: ParentCommQueryDto) {
    try {
      return await this.service.findAll(query);
    } catch (error) {
      this.handleError(error, 'Muloqotlar ro‘yxatini olishda server xatosi yuz berdi');
    }
  }

  @Post()
  @Permissions([AppPermission.STUDENTS_MANAGE])
  @ApiOperation({ summary: 'Muloqot qo‘shish' })
  @ApiResponse({ status: HttpStatus.CREATED, type: ParentCommResponseSchema })
  async create(
    @Body() dto: CreateParentCommDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
  ) {
    try {
      return await this.service.create(dto, this.buildActor(user, request));
    } catch (error) {
      this.handleError(error, 'Muloqot qo‘shishda server xatosi yuz berdi');
    }
  }

  @Get(':id')
  @Permissions([AppPermission.STUDENTS_READ])
  @ApiOperation({ summary: 'Muloqotni ID bo‘yicha olish' })
  @ApiParam(uuidParamDocs)
  @ApiResponse({ status: HttpStatus.OK, type: ParentCommResponseSchema })
  async findOne(@Param() params: UuidParamDto) {
    try {
      return await this.service.findOne(params.id);
    } catch (error) {
      this.handleError(error, 'Muloqotni olishda server xatosi yuz berdi');
    }
  }

  @Patch(':id')
  @Permissions([AppPermission.STUDENTS_MANAGE])
  @ApiOperation({ summary: 'Muloqotni tahrirlash' })
  @ApiParam(uuidParamDocs)
  @ApiResponse({ status: HttpStatus.OK, type: ParentCommResponseSchema })
  async update(
    @Param() params: UuidParamDto,
    @Body() dto: UpdateParentCommDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
  ) {
    try {
      return await this.service.update(params.id, dto, this.buildActor(user, request));
    } catch (error) {
      this.handleError(error, 'Muloqotni tahrirlashda server xatosi yuz berdi');
    }
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Permissions([AppPermission.STUDENTS_MANAGE])
  @ApiOperation({ summary: 'Muloqotni arxivlash (soft-delete)' })
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
      this.handleError(error, 'Muloqotni arxivlashda server xatosi yuz berdi');
    }
  }

  private buildActor(user: AuthenticatedUser, request: Request): ParentCommActor {
    return { userId: user?.id, ipAddress: request?.ip };
  }

  private handleError(error: unknown, fallbackMessage: string): never {
    if (error instanceof HttpException) {
      throw error;
    }
    throw new InternalServerErrorException(fallbackMessage);
  }
}
