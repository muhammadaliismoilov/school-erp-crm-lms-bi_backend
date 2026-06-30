import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AppPermission } from '../../common/constants/permissions';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { UuidParamDto } from '../../common/dto/uuid-param.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { CreateInteractionDto, InteractionQueryDto, UpdateInteractionDto } from './dto/interaction.dto';
import { InteractionService } from './interaction.service';

@ApiTags('HR Interactions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller({ path: 'hr/interactions', version: '1' })
export class InteractionController {
  constructor(private readonly interactionService: InteractionService) {}

  @Get() @Permissions([AppPermission.HR_READ]) find(@Query() query: InteractionQueryDto) { return this.interactionService.findInteractions(query); }
  @Get(':id') @Permissions([AppPermission.HR_READ]) get(@Param() p: UuidParamDto) { return this.interactionService.getInteraction(p.id); }
  @Post() @Permissions([AppPermission.HR_MANAGE]) create(@Body() dto: CreateInteractionDto) { return this.interactionService.createInteraction(dto); }
  @Patch(':id') @Permissions([AppPermission.HR_MANAGE]) update(@Param() p: UuidParamDto, @Body() dto: UpdateInteractionDto) { return this.interactionService.updateInteraction(p.id, dto); }
  @Delete(':id') @HttpCode(HttpStatus.NO_CONTENT) @Permissions([AppPermission.HR_MANAGE]) remove(@Param() p: UuidParamDto) { return this.interactionService.removeInteraction(p.id); }
}
