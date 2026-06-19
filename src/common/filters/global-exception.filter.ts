import * as Sentry from '@sentry/nestjs';
import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import { QueryFailedError } from 'typeorm';
import { LocalizedText, pickLocalizedText, resolveLocale } from '../i18n/locale';
import { getLocalizedMessage, resolveErrorCode } from '../i18n/messages';

interface MappedDbError {
  status: number;
  code: string;
  messages: LocalizedText;
}

/**
 * TypeORM `QueryFailedError` (Postgres SQLSTATE) ni mijozga tushunarli 4xx ga map qiladi.
 * Noma'lum DB xatolari `null` qaytaradi — ular baribir 500 bo'lib qoladi.
 */
const mapDatabaseError = (exception: unknown): MappedDbError | null => {
  if (!(exception instanceof QueryFailedError)) {
    return null;
  }
  const driverError = (exception as { driverError?: { code?: string } }).driverError;
  const sqlState = driverError?.code ?? (exception as { code?: string }).code;
  switch (sqlState) {
    case '23505': // unique_violation
      return {
        status: HttpStatus.CONFLICT,
        code: 'RESOURCE_CONFLICT',
        messages: {
          uz: 'Bunday yozuv allaqachon mavjud',
          ru: 'Такая запись уже существует',
          en: 'A record with these values already exists',
        },
      };
    case '23503': // foreign_key_violation
      return {
        status: HttpStatus.CONFLICT,
        code: 'RELATED_RESOURCE_CONFLICT',
        messages: {
          uz: "Bog'liq yozuv mavjud emas yoki hali ishlatilmoqda",
          ru: 'Связанная запись не существует или ещё используется',
          en: 'A referenced record is missing or still in use',
        },
      };
    case '23502': // not_null_violation
    case '23514': // check_violation
    case '22001': // string_data_right_truncation (value too long)
    case '22003': // numeric_value_out_of_range
    case '22007': // invalid_datetime_format
    case '22P02': // invalid_text_representation (bad uuid/enum/number)
      return {
        status: HttpStatus.BAD_REQUEST,
        code: 'VALIDATION_FAILED',
        messages: {
          uz: "Kiritilgan ma'lumotlar noto'g'ri",
          ru: 'Введенные данные некорректны',
          en: 'The submitted data is invalid',
        },
      };
    default:
      return null;
  }
};

type ErrorBody =
  | string
  | {
      code?: string;
      error?: string;
      message?: string | string[] | LocalizedText;
      statusCode?: number;
      details?: unknown;
    };

const isLocalizedText = (value: unknown): value is LocalizedText =>
  Boolean(
    value &&
      typeof value === 'object' &&
      'uz' in value &&
      'ru' in value &&
      'en' in value,
  );

const extractBodyMessage = (body: ErrorBody): unknown => {
  if (typeof body === 'string') {
    return body;
  }

  return body.message ?? body.error;
};

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<{
      url: string;
      method: string;
      headers: Record<string, string | string[] | undefined>;
    }>();
    const locale = resolveLocale(
      request.headers['accept-language'] ?? request.headers['x-language'],
    );

    // DB-darajadagi xatolarni (FK/unique/uzunlik/format) toza 4xx ga map qilamiz —
    // aks holda ular mijoz tuzatishi mumkin bo'lsa-da, 500 bo'lib qaytadi.
    const dbError = mapDatabaseError(exception);
    if (dbError) {
      this.logger.warn(`${request.method} ${request.url} -> ${dbError.status} (${dbError.code})`);
      response.status(dbError.status).json({
        success: false,
        error: {
          statusCode: dbError.status,
          code: dbError.code,
          locale,
          message: pickLocalizedText(dbError.messages, locale),
          messages: dbError.messages,
          path: request.url,
          method: request.method,
          timestamp: new Date().toISOString(),
        },
      });
      return;
    }

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const body: ErrorBody =
      exception instanceof HttpException
        ? exception.getResponse()
        : { message: 'Internal server error' };

    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      Sentry.captureException(exception);
      this.logger.error(
        `${request.method} ${request.url} -> ${status}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    const bodyMessage = extractBodyMessage(body);
    const code =
      typeof body !== 'string' && body.code
        ? body.code
        : resolveErrorCode(status, bodyMessage);
    const messages = isLocalizedText(bodyMessage)
      ? bodyMessage
      : getLocalizedMessage(code);

    response.status(status).json({
      success: false,
      error: {
        statusCode: status,
        code,
        locale,
        message: pickLocalizedText(messages, locale),
        messages,
        details: typeof body === 'string' ? undefined : body.details,
        path: request.url,
        method: request.method,
        timestamp: new Date().toISOString(),
      },
    });
  }
}
