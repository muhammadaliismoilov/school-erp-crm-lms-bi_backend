import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AppPermission } from '../../common/constants/permissions';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { UuidParamDto } from '../../common/dto/uuid-param.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { CreateHolidayDto, HolidayQueryDto, UpdateHolidayDto } from './dto/holiday.dto';
import { HolidayService } from './holiday.service';

/** Ish kalendari — bayram/dam olish kunlari. */
@ApiTags('HR Holidays')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller({ path: 'hr/holidays', version: '1' })
export class HolidayController {
  constructor(private readonly service: HolidayService) {}

  @Get()
  @Permissions([AppPermission.HR_HOLIDAYS_READ])
  find(@Query() query: HolidayQueryDto) {
    return this.service.find(query);
  }

  @Post()
  @Permissions([AppPermission.HR_HOLIDAYS_CREATE])
  create(@Body() dto: CreateHolidayDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  @Permissions([AppPermission.HR_HOLIDAYS_UPDATE])
  update(@Param() p: UuidParamDto, @Body() dto: UpdateHolidayDto) {
    return this.service.update(p.id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Permissions([AppPermission.HR_HOLIDAYS_DELETE])
  remove(@Param() p: UuidParamDto) {
    return this.service.remove(p.id);
  }
}
