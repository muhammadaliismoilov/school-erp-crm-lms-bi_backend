import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AppPermission } from '../../common/constants/permissions';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { UuidParamDto } from '../../common/dto/uuid-param.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { ApiLocalizedErrorResponses } from '../../common/swagger/api-localized-error-responses.decorator';
import { LeadersQueryDto } from './dto/leaders-query.dto';
import { RatingQueryDto } from './dto/rating-query.dto';
import { StudentsRatingService } from './students-rating.service';
import {
  RatingClassAverageSchema,
  RatingLeadersResponseSchema,
  RatingListResponseSchema,
  RatingStudentDetailSchema,
  RatingSubjectAverageSchema,
} from './swagger/rating-response.schema';

@ApiTags('O‘quvchilar reytingi')
@ApiBearerAuth()
@ApiLocalizedErrorResponses({ notFound: true })
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('students-rating')
export class StudentsRatingController {
  constructor(private readonly ratingService: StudentsRatingService) {}

  @Get()
  @Permissions([AppPermission.STUDENTS_READ])
  @ApiOperation({ summary: 'Reyting jadvali — filtr, pagination va stat kartalar.' })
  @ApiResponse({ status: 200, type: RatingListResponseSchema })
  getRating(@Query() query: RatingQueryDto): Promise<RatingListResponseSchema> {
    return this.ratingService.getRating(query);
  }

  @Get('leaders')
  @Permissions([AppPermission.STUDENTS_READ])
  @ApiOperation({ summary: 'Liderlar — podium (3) va top ro‘yxat (10/20).' })
  @ApiResponse({ status: 200, type: RatingLeadersResponseSchema })
  getLeaders(@Query() query: LeadersQueryDto): Promise<RatingLeadersResponseSchema> {
    return this.ratingService.getLeaders(query);
  }

  @Get('classes')
  @Permissions([AppPermission.STUDENTS_READ])
  @ApiOperation({ summary: 'Sinflar bo‘yicha o‘rtacha umumiy ball.' })
  @ApiResponse({ status: 200, type: [RatingClassAverageSchema] })
  getClassAverages(@Query() query: LeadersQueryDto): Promise<RatingClassAverageSchema[]> {
    return this.ratingService.getClassAverages(query);
  }

  @Get('subjects')
  @Permissions([AppPermission.STUDENTS_READ])
  @ApiOperation({ summary: 'Fanlar bo‘yicha o‘rtacha choraklik baho.' })
  @ApiResponse({ status: 200, type: [RatingSubjectAverageSchema] })
  getSubjectAverages(@Query() query: LeadersQueryDto): Promise<RatingSubjectAverageSchema[]> {
    return this.ratingService.getSubjectAverages(query);
  }

  @Get(':id')
  @Permissions([AppPermission.STUDENTS_READ])
  @ApiOperation({ summary: 'Bitta o‘quvchining to‘liq reyting kartasi (modal).' })
  @ApiParam({ name: 'id', description: 'O‘quvchi IDsi (UUID).', format: 'uuid' })
  @ApiResponse({ status: 200, type: RatingStudentDetailSchema })
  getStudentDetail(@Param() params: UuidParamDto): Promise<RatingStudentDetailSchema> {
    return this.ratingService.getStudentDetail(params.id);
  }
}
