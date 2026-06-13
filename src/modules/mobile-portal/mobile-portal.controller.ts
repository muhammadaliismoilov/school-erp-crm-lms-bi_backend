import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AppPermission } from '../../common/constants/permissions';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { ChildPortalQueryDto } from './dto/mobile-portal.dto';
import { MobilePortalService } from './mobile-portal.service';
@ApiTags('Mobile Parent Portal') @ApiBearerAuth() @UseGuards(JwtAuthGuard, PermissionsGuard) @Controller({ path: 'mobile-portal', version: '1' })
export class MobilePortalController { constructor(private readonly service: MobilePortalService) {}
  @Get('parents/:id/children') @Permissions([AppPermission.MOBILE_PORTAL_READ]) children(@Param('id') parentId: string) { return this.service.findParentChildren(parentId); }
  @Get('children/:id/overview') @Permissions([AppPermission.MOBILE_PORTAL_READ]) childOverview(@Param('id') studentId: string) { return this.service.childOverview(studentId); }
  @Get('meals') @Permissions([AppPermission.MOBILE_PORTAL_READ]) meals(@Query() q: ChildPortalQueryDto) { return this.service.findMeals(q); }
}
