import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Role } from '../identity/entities/role.entity';
import { User } from '../identity/entities/user.entity';
import { UserSession } from '../identity/entities/user-session.entity';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './jwt.strategy';
import { PasswordService } from './password.service';
import { SessionRegistryService } from './session-registry.service';
import { NotificationsDeliveryModule } from '../notifications-delivery/notifications-delivery.module';
import { SchoolsModule } from '../schools/schools.module';

@Module({
  imports: [
    PassportModule,
    JwtModule.register({}),
    TypeOrmModule.forFeature([User, Role, UserSession]),
    NotificationsDeliveryModule,
    SchoolsModule,
  ],
  controllers: [AuthController],
  providers: [AuthService, PasswordService, JwtStrategy, SessionRegistryService],
  exports: [AuthService, PasswordService, SessionRegistryService],
})
export class AuthModule {}
