import { registerDecorator } from 'class-validator';
import type { ValidationArguments, ValidationOptions } from 'class-validator';
import { supportedLocales } from '../locale';

export const HasAllLocales = (
  validationOptions?: ValidationOptions,
): PropertyDecorator =>
  (object: object, propertyName: string | symbol): void => {
    registerDecorator({
      name: 'hasAllLocales',
      target: object.constructor,
      propertyName: String(propertyName),
      options: validationOptions,
      validator: {
        validate(value: unknown): boolean {
          if (!Array.isArray(value)) {
            return false;
          }

          const locales = value
            .map((item) =>
              item && typeof item === 'object' && 'locale' in item
                ? String(item.locale)
                : undefined,
            )
            .filter(Boolean);

          return (
            new Set(locales).size === supportedLocales.length &&
            supportedLocales.every((locale) => locales.includes(locale))
          );
        },
        defaultMessage(args: ValidationArguments): string {
          return `${args.property} must contain exactly one translation for uz, ru, and en`;
        },
      },
    });
  };
