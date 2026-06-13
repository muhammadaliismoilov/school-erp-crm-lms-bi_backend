import { IsEmail, IsString, MinLength } from 'class-validator';
import { buildValidationException } from '../../src/common/validation/localized-validation.factory';
import { resolveLocale } from '../../src/common/i18n/locale';
import { validateDto } from '../../src/common/validation/validate-dto';

class ExampleDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(3)
  name: string;
}

describe('localized validation', () => {
  it('resolves supported locales from language headers', () => {
    expect(resolveLocale('ru-RU,ru;q=0.9,en;q=0.8')).toBe('ru');
    expect(resolveLocale('uz')).toBe('uz');
    expect(resolveLocale('fr-FR,en;q=0.7')).toBe('en');
  });

  it('returns validation errors with Uzbek, Russian, and English messages', async () => {
    const errors = await validateDto(ExampleDto, {
      email: 'not-email',
      name: 'Al',
      extra: 'forbidden',
    });

    const exception = buildValidationException(errors);
    const response = exception.getResponse();

    expect(response).toMatchObject({
      code: 'VALIDATION_FAILED',
      message: {
        uz: expect.any(String),
        ru: expect.any(String),
        en: expect.any(String),
      },
    });
    expect(JSON.stringify(response)).toContain('email');
    expect(JSON.stringify(response)).toContain('extra');
  });
});
