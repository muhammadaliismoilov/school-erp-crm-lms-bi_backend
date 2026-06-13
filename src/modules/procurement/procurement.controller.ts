import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AppPermission } from '../../common/constants/permissions';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { UuidParamDto } from '../../common/dto/uuid-param.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { CreateVendorDto, UpdateVendorDto, CreatePurchaseRequestDto, UpdatePurchaseRequestDto, CreatePurchaseOrderDto, UpdatePurchaseOrderDto, CreateGoodsReceiptDto, UpdateGoodsReceiptDto } from './dto/procurement.dto';
import { ProcurementService } from './procurement.service';

@ApiTags('Procurement')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller({ path: 'procurement', version: '1' })
export class ProcurementController {
  constructor(private readonly service: ProcurementService) {}

  @Get('vendors')
  @Permissions([AppPermission.PROCUREMENT_READ])
  findVendors() { return this.service.findVendors(); }

  @Post('vendors')
  @Permissions([AppPermission.PROCUREMENT_MANAGE])
  createVendors(@Body() dto: CreateVendorDto) { return this.service.createVendors(dto); }

  @Patch('vendors/:id')
  @Permissions([AppPermission.PROCUREMENT_MANAGE])
  updateVendors(@Param() params: UuidParamDto, @Body() dto: UpdateVendorDto) { return this.service.updateVendors(params.id, dto); }

  @Get('requests')
  @Permissions([AppPermission.PROCUREMENT_READ])
  findRequests() { return this.service.findRequests(); }

  @Post('requests')
  @Permissions([AppPermission.PROCUREMENT_MANAGE])
  createRequests(@Body() dto: CreatePurchaseRequestDto) { return this.service.createRequests(dto); }

  @Patch('requests/:id')
  @Permissions([AppPermission.PROCUREMENT_MANAGE])
  updateRequests(@Param() params: UuidParamDto, @Body() dto: UpdatePurchaseRequestDto) { return this.service.updateRequests(params.id, dto); }

  @Get('orders')
  @Permissions([AppPermission.PROCUREMENT_READ])
  findOrders() { return this.service.findOrders(); }

  @Post('orders')
  @Permissions([AppPermission.PROCUREMENT_MANAGE])
  createOrders(@Body() dto: CreatePurchaseOrderDto) { return this.service.createOrders(dto); }

  @Patch('orders/:id')
  @Permissions([AppPermission.PROCUREMENT_MANAGE])
  updateOrders(@Param() params: UuidParamDto, @Body() dto: UpdatePurchaseOrderDto) { return this.service.updateOrders(params.id, dto); }

  @Get('receipts')
  @Permissions([AppPermission.PROCUREMENT_READ])
  findReceipts() { return this.service.findReceipts(); }

  @Post('receipts')
  @Permissions([AppPermission.PROCUREMENT_MANAGE])
  createReceipts(@Body() dto: CreateGoodsReceiptDto) { return this.service.createReceipts(dto); }

  @Patch('receipts/:id')
  @Permissions([AppPermission.PROCUREMENT_MANAGE])
  updateReceipts(@Param() params: UuidParamDto, @Body() dto: UpdateGoodsReceiptDto) { return this.service.updateReceipts(params.id, dto); }
}
