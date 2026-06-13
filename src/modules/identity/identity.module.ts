import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { Permission } from './entities/permission.entity';
import { Role } from './entities/role.entity';
import { User } from './entities/user.entity';
import { IdentitySeedService } from './identity-seed.service';
import { PermissionsController } from './permissions.controller';
import { RolesController } from './roles.controller';
import { RolesService } from './roles.service';

@Module({
  imports: [TypeOrmModule.forFeature([Permission, Role, User]), AuthModule],
  controllers: [RolesController, PermissionsController],
  providers: [RolesService, IdentitySeedService],
  exports: [RolesService],
})
export class IdentityModule {}
