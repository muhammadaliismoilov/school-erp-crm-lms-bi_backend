import type { Repository } from 'typeorm';
import type { School } from '../src/modules/settings/entities/school.entity';
import { SettingsService } from '../src/modules/settings/settings.service';

describe('SettingsService', () => {
  let schools: jest.Mocked<Pick<Repository<School>, 'findOne' | 'create' | 'save'>>;
  let service: SettingsService;

  beforeEach(() => {
    schools = {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    };
    schools.create.mockReturnValue({} as School);
    schools.save.mockImplementation(async (value) => value as School);
    service = new SettingsService(schools as unknown as Repository<School>);
  });

  it('fills missing ru/en school name locales from uz', async () => {
    schools.findOne.mockResolvedValue(null);

    const result = await service.upsertSchool({
      name: { uz: 'Yuton maktabi' },
    } as never);

    expect(result.name).toEqual({
      uz: 'Yuton maktabi',
      ru: 'Yuton maktabi',
      en: 'Yuton maktabi',
    });
  });

  it('keeps explicitly provided locales', async () => {
    schools.findOne.mockResolvedValue(null);

    const result = await service.upsertSchool({
      name: { uz: 'Yuton', ru: 'Ютон', en: 'Yuton School' },
    } as never);

    expect(result.name).toEqual({ uz: 'Yuton', ru: 'Ютон', en: 'Yuton School' });
  });
});
