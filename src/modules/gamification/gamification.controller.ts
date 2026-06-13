import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AppPermission } from '../../common/constants/permissions';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { UuidParamDto } from '../../common/dto/uuid-param.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { AddCoinTransactionDto, AwardBadgeDto, CreateBadgeDto, UpdateBadgeDto } from './dto/gamification.dto';
import { GamificationService } from './gamification.service';
@ApiTags('Gamification') @ApiBearerAuth() @UseGuards(JwtAuthGuard, PermissionsGuard) @Controller({ path: 'gamification', version: '1' })
export class GamificationController { constructor(private readonly service: GamificationService) {}
  @Get('badges') @Permissions([AppPermission.GAMIFICATION_READ]) findBadges() { return this.service.findBadges(); }
  @Post('badges') @Permissions([AppPermission.GAMIFICATION_MANAGE]) createBadge(@Body() dto: CreateBadgeDto) { return this.service.createBadge(dto); }
  @Patch('badges/:id') @Permissions([AppPermission.GAMIFICATION_MANAGE]) updateBadge(@Param() p: UuidParamDto, @Body() dto: UpdateBadgeDto) { return this.service.updateBadge(p.id, dto); }
  @Post('badges/award') @Permissions([AppPermission.GAMIFICATION_MANAGE]) awardBadge(@Body() dto: AwardBadgeDto) { return this.service.awardBadge(dto); }
  @Get('wallets/:id') @Permissions([AppPermission.GAMIFICATION_READ]) getWallet(@Param('id') studentId: string) { return this.service.getWallet(studentId); }
  @Post('coins') @Permissions([AppPermission.GAMIFICATION_MANAGE]) addTransaction(@Body() dto: AddCoinTransactionDto) { return this.service.addTransaction(dto); }
  @Get('coins') @Permissions([AppPermission.GAMIFICATION_READ]) findTransactions(@Query('studentId') studentId?: string) { return this.service.findTransactions(studentId); }
}
