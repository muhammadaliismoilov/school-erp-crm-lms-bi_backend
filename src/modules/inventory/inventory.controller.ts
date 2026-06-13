import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AppPermission } from '../../common/constants/permissions';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { UuidParamDto } from '../../common/dto/uuid-param.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { CreateInventoryCategoryDto, CreateInventoryItemDto, CreateInventoryTransactionDto, UpdateInventoryCategoryDto, UpdateInventoryItemDto } from './dto/inventory.dto';
import { InventoryService } from './inventory.service';

@ApiTags('Inventory') @ApiBearerAuth() @UseGuards(JwtAuthGuard, PermissionsGuard) @Controller({ path: 'inventory', version: '1' })
export class InventoryController {
  constructor(private readonly service: InventoryService) {}
  @Get('categories') @Permissions([AppPermission.INVENTORY_READ]) findCategories() { return this.service.findCategories(); }
  @Post('categories') @Permissions([AppPermission.INVENTORY_MANAGE]) createCategory(@Body() dto: CreateInventoryCategoryDto) { return this.service.createCategory(dto); }
  @Patch('categories/:id') @Permissions([AppPermission.INVENTORY_MANAGE]) updateCategory(@Param() p: UuidParamDto, @Body() dto: UpdateInventoryCategoryDto) { return this.service.updateCategory(p.id, dto); }
  @Get('items') @Permissions([AppPermission.INVENTORY_READ]) findItems() { return this.service.findItems(); }
  @Get('items/:id') @Permissions([AppPermission.INVENTORY_READ]) getItem(@Param() p: UuidParamDto) { return this.service.getItem(p.id); }
  @Post('items') @Permissions([AppPermission.INVENTORY_MANAGE]) createItem(@Body() dto: CreateInventoryItemDto) { return this.service.createItem(dto); }
  @Patch('items/:id') @Permissions([AppPermission.INVENTORY_MANAGE]) updateItem(@Param() p: UuidParamDto, @Body() dto: UpdateInventoryItemDto) { return this.service.updateItem(p.id, dto); }
  @Get('transactions') @Permissions([AppPermission.INVENTORY_READ]) findTransactions() { return this.service.findTransactions(); }
  @Post('transactions') @Permissions([AppPermission.INVENTORY_MANAGE]) createTransaction(@Body() dto: CreateInventoryTransactionDto) { return this.service.createTransaction(dto); }
}
