import { BadRequestException } from '@nestjs/common';
import type { ValidationError } from 'class-validator';
import type { LocalizedText } from '../i18n/locale';
import { localizedMessages } from '../i18n/messages';

export interface LocalizedValidationConstraint {
  type: string;
  message: LocalizedText;
}

export interface LocalizedValidationError {
  field: string;
  messages: LocalizedValidationConstraint[];
}

const constraintMessages: Record<string, (field: string) => LocalizedText> = {
  whitelistValidation: (field) => ({
    uz: `${field} maydoni ruxsat etilmagan`,
    ru: `Поле ${field} не разрешено`,
    en: `${field} is not allowed`,
  }),
  isString: (field) => ({
    uz: `${field} matn bo'lishi kerak`,
    ru: `${field} должен быть строкой`,
    en: `${field} must be a string`,
  }),
  isEmail: (field) => ({
    uz: `${field} email formatida bo'lishi kerak`,
    ru: `${field} должен быть email-адресом`,
    en: `${field} must be an email address`,
  }),
  minLength: (field) => ({
    uz: `${field} juda qisqa`,
    ru: `${field} слишком короткое`,
    en: `${field} is too short`,
  }),
  isLength: (field) => ({
    uz: `${field} uzunligi noto'g'ri`,
    ru: `Длина ${field} некорректна`,
    en: `${field} has an invalid length`,
  }),
  matches: (field) => ({
    uz: `${field} formati noto'g'ri`,
    ru: `Формат ${field} некорректен`,
    en: `${field} has an invalid format`,
  }),
  isPhoneNumber: (field) => ({
    uz: `${field} telefon raqami formatida bo'lishi kerak`,
    ru: `${field} должен быть номером телефона`,
    en: `${field} must be a phone number`,
  }),
  isUUID: (field) => ({
    uz: `${field} UUID formatida bo'lishi kerak`,
    ru: `${field} должен быть UUID`,
    en: `${field} must be a UUID`,
  }),
  isEnum: (field) => ({
    uz: `${field} ruxsat etilgan qiymatlardan biri bo'lishi kerak`,
    ru: `${field} должен быть одним из допустимых значений`,
    en: `${field} must be one of the allowed values`,
  }),
  isISO8601: (field) => ({
    uz: `${field} ISO 8601 sana formatida bo'lishi kerak`,
    ru: `${field} должен быть датой в формате ISO 8601`,
    en: `${field} must be an ISO 8601 date`,
  }),
  isBoolean: (field) => ({
    uz: `${field} boolean bo'lishi kerak`,
    ru: `${field} должен быть boolean`,
    en: `${field} must be a boolean`,
  }),
  isInt: (field) => ({
    uz: `${field} butun son bo'lishi kerak`,
    ru: `${field} должен быть целым числом`,
    en: `${field} must be an integer`,
  }),
  min: (field) => ({
    uz: `${field} minimal qiymatdan kichik`,
    ru: `${field} меньше минимального значения`,
    en: `${field} is below the minimum value`,
  }),
  max: (field) => ({
    uz: `${field} maksimal qiymatdan katta`,
    ru: `${field} больше максимального значения`,
    en: `${field} is above the maximum value`,
  }),
  isArray: (field) => ({
    uz: `${field} ro'yxat bo'lishi kerak`,
    ru: `${field} должен быть массивом`,
    en: `${field} must be an array`,
  }),
  arrayMaxSize: (field) => ({
    uz: `${field} ro'yxatida elementlar juda ko'p`,
    ru: `В ${field} слишком много элементов`,
    en: `${field} has too many items`,
  }),
  isNumber: (field) => ({
    uz: `${field} raqam bo'lishi kerak`,
    ru: `${field} должен быть числом`,
    en: `${field} must be a number`,
  }),
  isPositive: (field) => ({
    uz: `${field} musbat son bo'lishi kerak`,
    ru: `${field} должен быть положительным числом`,
    en: `${field} must be a positive number`,
  }),
  isObject: (field) => ({
    uz: `${field} obyekt bo'lishi kerak`,
    ru: `${field} должен быть объектом`,
    en: `${field} must be an object`,
  }),
};

const fallbackConstraintMessage = (field: string): LocalizedText => ({
  uz: `${field} qiymati noto'g'ri`,
  ru: `Значение ${field} некорректно`,
  en: `${field} is invalid`,
});

const flattenValidationErrors = (
  errors: ValidationError[],
  parentPath = '',
): LocalizedValidationError[] =>
  errors.flatMap((error) => {
    const field = parentPath ? `${parentPath}.${error.property}` : error.property;
    const ownMessages = Object.keys(error.constraints ?? {}).map((type) => ({
      type,
      message: (constraintMessages[type] ?? fallbackConstraintMessage)(field),
    }));
    const childMessages = flattenValidationErrors(error.children ?? [], field);

    return ownMessages.length > 0
      ? [{ field, messages: ownMessages }, ...childMessages]
      : childMessages;
  });

export const buildValidationException = (
  errors: ValidationError[],
): BadRequestException =>
  new BadRequestException({
    code: 'VALIDATION_FAILED',
    message: localizedMessages.VALIDATION_FAILED,
    details: flattenValidationErrors(errors),
  });
