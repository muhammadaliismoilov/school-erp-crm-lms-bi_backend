import { applyDecorators } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiForbiddenResponse,
  ApiInternalServerErrorResponse,
  ApiNotFoundResponse,
  ApiTooManyRequestsResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { LocalizedErrorResponseDto } from './localized-error-response.dto';

interface ApiLocalizedErrorOptions {
  notFound?: boolean;
  conflict?: boolean;
  unauthorized?: boolean;
  forbidden?: boolean;
}

export const ApiLocalizedErrorResponses = (
  options: ApiLocalizedErrorOptions = {},
): MethodDecorator & ClassDecorator =>
  applyDecorators(
    ApiBadRequestResponse({
      description: 'Validatsiya xatosi. Xabarlar o‘zbek, rus va ingliz tillarida qaytariladi.',
      type: LocalizedErrorResponseDto,
    }),
    ...(options.unauthorized === false
      ? []
      : [
          ApiUnauthorizedResponse({
            description: 'Autentifikatsiya xatosi mahalliylashtirilgan xabarlar bilan qaytariladi.',
            type: LocalizedErrorResponseDto,
          }),
        ]),
    ...(options.forbidden === false
      ? []
      : [
          ApiForbiddenResponse({
            description: 'Ruxsat xatosi mahalliylashtirilgan xabarlar bilan qaytariladi.',
            type: LocalizedErrorResponseDto,
          }),
        ]),
    ...(options.notFound
      ? [
          ApiNotFoundResponse({
            description: 'Resurs topilmadi xatosi mahalliylashtirilgan xabarlar bilan qaytariladi.',
            type: LocalizedErrorResponseDto,
          }),
        ]
      : []),
    ...(options.conflict
      ? [
          ApiConflictResponse({
            description: 'Konflikt xatosi mahalliylashtirilgan xabarlar bilan qaytariladi.',
            type: LocalizedErrorResponseDto,
          }),
        ]
      : []),
    ApiTooManyRequestsResponse({
      description: 'Rate limit xatosi mahalliylashtirilgan xabarlar bilan qaytariladi.',
      type: LocalizedErrorResponseDto,
    }),
    ApiInternalServerErrorResponse({
      description: 'Kutilmagan server xatosi mahalliylashtirilgan xabarlar bilan qaytariladi.',
      type: LocalizedErrorResponseDto,
    }),
  );
