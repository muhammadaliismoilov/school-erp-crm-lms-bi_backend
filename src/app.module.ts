import { BullModule } from "@nestjs/bullmq";
import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { APP_GUARD } from "@nestjs/core";
import { ScheduleModule } from "@nestjs/schedule";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { TypeOrmModule } from "@nestjs/typeorm";
import type { TypeOrmModuleOptions } from "@nestjs/typeorm";
import appConfig from "./config/app.config";
import databaseConfig from "./config/database.config";
import { validateEnv } from "./config/env.validation";
import jwtConfig from "./config/jwt.config";
import observabilityConfig from "./config/observability.config";
import redisConfig from "./config/redis.config";
import securityConfig from "./config/security.config";
import storageConfig from "./config/storage.config";
import { AcademicModule } from "./modules/academic/academic.module";
import { AnalyticsModule } from "./modules/analytics/analytics.module";
import { AttendanceModule } from "./modules/attendance/attendance.module";
import { AuditModule } from "./modules/audit/audit.module";
import { AuthModule } from "./modules/auth/auth.module";
import { CrmModule } from "./modules/crm/crm.module";
import { FilesModule } from "./modules/files/files.module";
import { FinanceModule } from "./modules/finance/finance.module";
import { HealthModule } from "./modules/health/health.module";
import { HrModule } from "./modules/hr/hr.module";
import { IdentityModule } from "./modules/identity/identity.module";
import { InventoryModule } from "./modules/inventory/inventory.module";
import { LmsModule } from "./modules/lms/lms.module";
import { NotificationsModule } from "./modules/notifications/notifications.module";
import { ObservabilityModule } from "./modules/observability/observability.module";
import { SchoolsModule } from "./modules/schools/schools.module";
import { SettingsModule } from "./modules/settings/settings.module";
import { StudentsModule } from "./modules/students/students.module";
import { UsersModule } from "./modules/users/users.module";
import { WorkersModule } from "./modules/workers/workers.module";
import { YouthServicesModule } from "./modules/youth-services/youth-services.module";
import { AppealsModule } from "./modules/appeals/appeals.module";
import { IntegrationsModule } from "./modules/integrations/integrations.module";
import { FeedbackModule } from "./modules/feedback/feedback.module";
import { GamificationModule } from "./modules/gamification/gamification.module";
import { HomeworkModule } from "./modules/homework/homework.module";
import { KpiModule } from "./modules/kpi/kpi.module";
import { MobilePortalModule } from "./modules/mobile-portal/mobile-portal.module";
import { ReportsModule } from "./modules/reports/reports.module";
import { WorkflowModule } from "./modules/workflow/workflow.module";
import { TransportModule } from "./modules/transport/transport.module";
import { ImportsExportsModule } from "./modules/imports-exports/imports-exports.module";
import { DocumentsModule } from "./modules/documents/documents.module";
import { CommunicationModule } from "./modules/communication/communication.module";
import { AccessControlModule } from "./modules/access-control/access-control.module";
import { AdmissionsModule } from "./modules/admissions/admissions.module";
import { TimetableModule } from "./modules/timetable/timetable.module";
import { LibraryModule } from "./modules/library/library.module";
import { HealthSafetyModule } from "./modules/health-safety/health-safety.module";
import { ProcurementModule } from "./modules/procurement/procurement.module";
import { AssetsModule } from "./modules/assets/assets.module";
import { AdvancedFinanceModule } from "./modules/advanced-finance/advanced-finance.module";
import { CounselingModule } from "./modules/counseling/counseling.module";
import { GradeRequestsModule } from "./modules/grade-requests/grade-requests.module";
import { ParentCommsModule } from "./modules/parent-comms/parent-comms.module";
import { StudentsRatingModule } from "./modules/students-rating/students-rating.module";
import { ProgressReportsModule } from "./modules/progress-reports/progress-reports.module";
import { TransactionsModule } from "./modules/transactions/transactions.module";
import { StudentPaymentsModule } from "./modules/student-payments/student-payments.module";
import { EncryptionModule } from "./common/security/encryption.module";

const buildTypeOrmOptions = (
  configService: ConfigService,
): TypeOrmModuleOptions => {
  const ssl = configService.get<boolean>("database.ssl")
    ? { rejectUnauthorized: false }
    : false;
  const baseOptions = {
    type: "postgres" as const,
    autoLoadEntities: true,
    synchronize: configService.get<boolean>("database.synchronize") ?? false,
    logging: configService.get<boolean>("database.logging") ?? false,
    migrationsRun: false,
    migrations: [__dirname + "/database/migrations/*{.ts,.js}"],
    ssl,
  };
  const master = {
    host: configService.getOrThrow<string>("database.host"),
    port: configService.getOrThrow<number>("database.port"),
    username: configService.getOrThrow<string>("database.username"),
    password: configService.getOrThrow<string>("database.password"),
    database: configService.getOrThrow<string>("database.name"),
  };
  const replicaHost = configService.get<string>("database.replica.host");

  if (!replicaHost) {
    return {
      ...baseOptions,
      ...master,
    };
  }

  return {
    ...baseOptions,
    replication: {
      master,
      slaves: [
        {
          host: replicaHost,
          port: configService.getOrThrow<number>("database.replica.port"),
          username:
            configService.get<string>("database.replica.username") ??
            master.username,
          password:
            configService.get<string>("database.replica.password") ??
            master.password,
          database:
            configService.get<string>("database.replica.name") ??
            master.database,
        },
      ],
    },
  };
};

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      expandVariables: true,
      load: [
        appConfig,
        databaseConfig,
        jwtConfig,
        observabilityConfig,
        redisConfig,
        securityConfig,
        storageConfig,
      ],
      validate: validateEnv,
    }),
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => [
        {
          ttl: configService.getOrThrow<number>("security.rateLimitTtlMs"),
          limit: configService.getOrThrow<number>("security.rateLimitLimit"),
        },
      ],
    }),
    ScheduleModule.forRoot(),
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        connection: {
          host: configService.getOrThrow<string>("redis.host"),
          port: configService.getOrThrow<number>("redis.port"),
          username: configService.get<string>("redis.username"),
          password: configService.get<string>("redis.password"),
          db: configService.get<number>("redis.db") ?? 0,
          tls: configService.get("redis.tls"),
        },
      }),
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: buildTypeOrmOptions,
    }),
    HealthModule,
    ObservabilityModule,
    AuthModule,
    IdentityModule,
    UsersModule,
    CrmModule,
    StudentsModule,
    AcademicModule,
    AttendanceModule,
    FinanceModule,
    NotificationsModule,
    SettingsModule,
    SchoolsModule,
    AuditModule,
    FilesModule,
    WorkersModule,
    HrModule,
    InventoryModule,
    YouthServicesModule,
    LmsModule,
    AnalyticsModule,
    AppealsModule,
    IntegrationsModule,
    HomeworkModule,
    GamificationModule,
    FeedbackModule,
    KpiModule,
    ReportsModule,
    MobilePortalModule,
    WorkflowModule,
    ImportsExportsModule,
    AccessControlModule,
    TransportModule,
    CommunicationModule,
    DocumentsModule,
    AdmissionsModule,
    TimetableModule,
    LibraryModule,
    HealthSafetyModule,
    ProcurementModule,
    AssetsModule,
    AdvancedFinanceModule,
    EncryptionModule,
    CounselingModule,
    GradeRequestsModule,
    ParentCommsModule,
    StudentsRatingModule,
    ProgressReportsModule,
    TransactionsModule,
    StudentPaymentsModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
