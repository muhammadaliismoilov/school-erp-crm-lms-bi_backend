import "reflect-metadata";
import * as Sentry from "@sentry/nestjs";
import { Logger, ValidationPipe, VersioningType } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import type { NestExpressApplication } from "@nestjs/platform-express";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import compression from "compression";
import cookieParser from "cookie-parser";
import { json, urlencoded } from "express";
import helmet from "helmet";
import { AppModule } from "./app.module";
import { GlobalExceptionFilter } from "./common/filters/global-exception.filter";
import { ResponseEnvelopeInterceptor } from "./common/interceptors/response-envelope.interceptor";
import { buildValidationException } from "./common/validation/localized-validation.factory";
import { startMetricsServer } from "./modules/observability/metrics-server";
import { MetricsService } from "./modules/observability/metrics.service";

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: true,
    bodyParser: false,
  });
  const configService = app.get(ConfigService);
  const logger = new Logger("Bootstrap");
  const sentryDsn = configService.get<string>("observability.sentryDsn");

  if (sentryDsn) {
    Sentry.init({
      dsn: sentryDsn,
      environment: configService.get<string>("app.env") ?? "development",
      tracesSampleRate:
        configService.get<number>("observability.sentryTracesSampleRate") ??
        0.1,
    });
  }

  const expressApp = app.getHttpAdapter().getInstance();
  expressApp.set(
    "trust proxy",
    configService.get<boolean>("security.trustProxy") ?? false,
  );

  const bodyLimit = configService.get<string>("security.bodyLimit") ?? "1mb";
  app.use(json({ limit: bodyLimit }));
  app.use(urlencoded({ extended: true, limit: bodyLimit }));
  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginResourcePolicy: { policy: "cross-origin" },
    }),
  );
  app.use(compression());
  app.use(cookieParser());

  // Serve locally-stored uploads (local storage driver) at the static prefix.
  if ((configService.get<string>("storage.driver") ?? "local") === "local") {
    const localDir = configService.get<string>("storage.localDir");
    const staticPrefix = configService.get<string>("storage.staticPrefix") ?? "/static";
    if (localDir) {
      app.useStaticAssets(localDir, { prefix: staticPrefix });
    }
  }

  app.enableCors({
    origin: configService.get<string[] | boolean>("app.corsOrigins") ?? true,
    credentials: true,
  });

  app.setGlobalPrefix(configService.get<string>("app.globalPrefix") ?? "api");
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: "1",
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      forbidUnknownValues: true,
      transform: true,
      stopAtFirstError: false,
      transformOptions: { enableImplicitConversion: true },
      exceptionFactory: buildValidationException,
    }),
  );
  app.useGlobalFilters(new GlobalExceptionFilter());
  app.useGlobalInterceptors(new ResponseEnvelopeInterceptor());

  if (configService.get<boolean>("security.swaggerEnabled") ?? true) {
    const swaggerConfig = new DocumentBuilder()
      .setTitle("Yuton School boshqaruv API")
      .setDescription(
        "Yagona maktab boshqaruv backend API. Barcha validatsiya va API xatolari o‘zbek, rus va ingliz tillarida qaytariladi. Asosiy xabar tilini tanlash uchun Accept-Language: uz, ru yoki en headeridan foydalaning. Production stack: JWT auth, class-validator, Helmet, rate limiting, audit log, Redis workerlar, S3/MinIO storage, Sentry va Prometheus metrikalari.",
      )
      .setVersion("1.0")
      .addBearerAuth()
      .addCookieAuth("access_token")
      .addServer("/", "Joriy host")
      .addGlobalParameters({
        name: "Accept-Language",
        in: "header",
        required: false,
        schema: { type: "string", enum: ["uz", "ru", "en"], default: "uz" },
        description:
          "Javob tili: uz, ru yoki en. Xato payloadlari doim error.messages ichida uchala tilni qaytaradi.",
      })
      .build();
    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup("docs", app, document);
  }

  const port = configService.get<number>("app.port") ?? 3000;
  await app.listen(port, "0.0.0.0");
  logger.log(`API is running on http://localhost:${port}`);

  // Alohida port, asosiy quvurdan tashqarida — sabab: metrics-server.ts izohida.
  if (configService.get<boolean>("observability.metricsEnabled") ?? true) {
    const metricsPort = configService.get<number>("observability.metricsPort") ?? 9464;
    startMetricsServer(app.get(MetricsService), metricsPort, logger);
  }
}

void bootstrap();
