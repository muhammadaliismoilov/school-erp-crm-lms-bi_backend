import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AppPermission } from '../../common/constants/permissions';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { UuidParamDto } from '../../common/dto/uuid-param.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { CreateFixedAssetDto, UpdateFixedAssetDto, CreateAssetMaintenanceTicketDto, UpdateAssetMaintenanceTicketDto, CreateAssetDepreciationDto, UpdateAssetDepreciationDto } from './dto/assets.dto';
import { AssetsService } from './assets.service';

@ApiTags('Assets')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller({ path: 'assets', version: '1' })
export class AssetsController {
  constructor(private readonly service: AssetsService) {}

  @Get('items')
  @Permissions([AppPermission.ASSETS_READ])
  findItems() { return this.service.findItems(); }

  @Post('items')
  @Permissions([AppPermission.ASSETS_MANAGE])
  createItems(@Body() dto: CreateFixedAssetDto) { return this.service.createItems(dto); }

  @Patch('items/:id')
  @Permissions([AppPermission.ASSETS_MANAGE])
  updateItems(@Param() params: UuidParamDto, @Body() dto: UpdateFixedAssetDto) { return this.service.updateItems(params.id, dto); }

  @Get('maintenance')
  @Permissions([AppPermission.ASSETS_READ])
  findMaintenance() { return this.service.findMaintenance(); }

  @Post('maintenance')
  @Permissions([AppPermission.ASSETS_MANAGE])
  createMaintenance(@Body() dto: CreateAssetMaintenanceTicketDto) { return this.service.createMaintenance(dto); }

  @Patch('maintenance/:id')
  @Permissions([AppPermission.ASSETS_MANAGE])
  updateMaintenance(@Param() params: UuidParamDto, @Body() dto: UpdateAssetMaintenanceTicketDto) { return this.service.updateMaintenance(params.id, dto); }

  @Get('depreciations')
  @Permissions([AppPermission.ASSETS_READ])
  findDepreciations() { return this.service.findDepreciations(); }

  @Post('depreciations')
  @Permissions([AppPermission.ASSETS_MANAGE])
  createDepreciations(@Body() dto: CreateAssetDepreciationDto) { return this.service.createDepreciations(dto); }

  @Patch('depreciations/:id')
  @Permissions([AppPermission.ASSETS_MANAGE])
  updateDepreciations(@Param() params: UuidParamDto, @Body() dto: UpdateAssetDepreciationDto) { return this.service.updateDepreciations(params.id, dto); }
}
