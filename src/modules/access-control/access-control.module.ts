import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AccessControlController } from './access-control.controller';
import { AccessControlService } from './access-control.service';
import { AccessDevice } from './entities/access-device.entity';
import { AccessEvent } from './entities/access-event.entity';
import { FaceProfile } from './entities/face-profile.entity';

@Module({ imports: [TypeOrmModule.forFeature([AccessDevice, FaceProfile, AccessEvent])], controllers: [AccessControlController], providers: [AccessControlService], exports: [AccessControlService] })
export class AccessControlModule {}
