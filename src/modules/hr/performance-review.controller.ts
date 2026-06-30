import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AppPermission } from '../../common/constants/permissions';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { UuidParamDto } from '../../common/dto/uuid-param.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import {
  CreatePerformanceReviewDto,
  PerformanceReviewQueryDto,
  UpdatePerformanceReviewDto,
} from './dto/performance-review.dto';
import { PerformanceReviewService } from './performance-review.service';

@ApiTags('HR Performance Reviews')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller({ path: 'hr/performance-reviews', version: '1' })
export class PerformanceReviewController {
  constructor(private readonly reviewService: PerformanceReviewService) {}

  @Get() @Permissions([AppPermission.HR_READ]) find(@Query() query: PerformanceReviewQueryDto) { return this.reviewService.findReviews(query); }
  @Get(':id') @Permissions([AppPermission.HR_READ]) get(@Param() p: UuidParamDto) { return this.reviewService.getReview(p.id); }
  @Post() @Permissions([AppPermission.HR_MANAGE]) create(@Body() dto: CreatePerformanceReviewDto) { return this.reviewService.createReview(dto); }
  @Patch(':id') @Permissions([AppPermission.HR_MANAGE]) update(@Param() p: UuidParamDto, @Body() dto: UpdatePerformanceReviewDto) { return this.reviewService.updateReview(p.id, dto); }
  @Delete(':id') @HttpCode(HttpStatus.NO_CONTENT) @Permissions([AppPermission.HR_MANAGE]) remove(@Param() p: UuidParamDto) { return this.reviewService.removeReview(p.id); }
}
