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
import { LocalizedText, pickLocalizedText, resolveLocale } from '../i18n/locale';
import { getLocalizedMessage, resolveErrorCode } from '../i18n/messages';

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
