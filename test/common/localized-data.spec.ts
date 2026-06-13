import { validateDto } from '../../src/common/validation/validate-dto';
import { LocalizedTextDto } from '../../src/common/i18n/dto/localized-text.dto';
import { pickLocalizedText } from '../../src/common/i18n/locale';

describe('localized data fields', () => {
  it('requires Uzbek, Russian, and English values for translatable short text', async () => {
    const errors = await validateDto(LocalizedTextDto, {
      uz: 'Matematika',
      ru: 'Математика',
    });

    expect(errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ property: 'en' }),
      ]),
    );
  });

  it('selects the requested locale while preserving all translations in storage', () => {
    const text = {
      uz: 'Matematika',
      ru: 'Математика',
      en: 'Mathematics',
    };

    expect(pickLocalizedText(text, 'ru')).toBe('Математика');
    expect(pickLocalizedText(text, 'en')).toBe('Mathematics');
  });
});
