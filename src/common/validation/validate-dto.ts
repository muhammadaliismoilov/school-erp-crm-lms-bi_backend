import { plainToInstance } from 'class-transformer';
import type { ClassConstructor } from 'class-transformer/types/interfaces';
import { validate } from 'class-validator';
import type { ValidationError } from 'class-validator';

export const validateDto = async <T extends object>(
  dtoClass: ClassConstructor<T>,
  value: unknown,
): Promise<ValidationError[]> => {
  const instance = plainToInstance(dtoClass, value);

  return validate(instance, {
    whitelist: true,
    forbidNonWhitelisted: true,
    forbidUnknownValues: true,
  });
};
