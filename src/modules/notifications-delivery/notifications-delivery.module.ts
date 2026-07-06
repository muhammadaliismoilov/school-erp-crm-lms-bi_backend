import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AttendanceSettings } from '../attendance/entities/attendance-settings.entity';
import { Student } from '../students/entities/student.entity';
import { StudentParent } from '../students/entities/student-parent.entity';
import { AttendanceNotifier } from './attendance-notifier.service';
import { SecurityNotifierService } from './security-notifier.service';
import { UserSession } from '../identity/entities/user-session.entity';
import { NotificationChannel } from './entities/notification-channel.entity';
import { NotificationOutbox } from './entities/notification-outbox.entity';
import { NotificationChannelController } from './notification-channel.controller';
import { NotificationChannelService } from './notification-channel.service';
import { NotificationDispatchService } from './notification-dispatch.service';
import { NOTIFICATION_QUEUE } from './notification-queue';
import { NotificationQueueService } from './notification-queue.service';
import { NotificationWorker } from './notification.worker';

@Module({
  imports: [
    BullModule.registerQueue({ name: NOTIFICATION_QUEUE }),
    TypeOrmModule.forFeature([
      NotificationChannel,
      NotificationOutbox,
      StudentParent,
      AttendanceSettings,
      Student,
      UserSession,
    ]),
  ],
  controllers: [NotificationChannelController],
  providers: [
    AttendanceNotifier,
    SecurityNotifierService,
    NotificationChannelService,
    NotificationDispatchService,
    NotificationQueueService,
    NotificationWorker,
  ],
  exports: [AttendanceNotifier, SecurityNotifierService],
})
export class NotificationsDeliveryModule {}
