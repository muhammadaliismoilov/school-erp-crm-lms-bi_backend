import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AppPermission } from '../../common/constants/permissions';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { UuidParamDto } from '../../common/dto/uuid-param.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { CreateVacancyDto, UpdateVacancyDto, VacancyQueryDto } from './dto/vacancy.dto';
import { VacancyService } from './vacancy.service';

@ApiTags('HR Vacancies')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller({ path: 'hr/vacancies', version: '1' })
export class VacancyController {
  constructor(private readonly vacancyService: VacancyService) {}

  @Get() @Permissions([AppPermission.HR_VACANCIES_READ]) find(@Query() query: VacancyQueryDto) { return this.vacancyService.findVacancies(query); }
  @Get(':id') @Permissions([AppPermission.HR_VACANCIES_READ]) get(@Param() p: UuidParamDto) { return this.vacancyService.getVacancy(p.id); }
  @Post() @Permissions([AppPermission.HR_VACANCIES_CREATE]) create(@Body() dto: CreateVacancyDto) { return this.vacancyService.createVacancy(dto); }
  @Patch(':id') @Permissions([AppPermission.HR_VACANCIES_UPDATE]) update(@Param() p: UuidParamDto, @Body() dto: UpdateVacancyDto) { return this.vacancyService.updateVacancy(p.id, dto); }
  @Delete(':id') @HttpCode(HttpStatus.NO_CONTENT) @Permissions([AppPermission.HR_VACANCIES_DELETE]) remove(@Param() p: UuidParamDto) { return this.vacancyService.removeVacancy(p.id); }
}
