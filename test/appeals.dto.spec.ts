import { validateDto } from '../src/common/validation/validate-dto';
import { CreateAppealDto } from '../src/modules/appeals/dto/create-appeal.dto';
import { UpdateAppealDto } from '../src/modules/appeals/dto/update-appeal.dto';
import {
  AppealSource,
  AppealStatus,
  AppealType,
  TargetRole,
} from '../src/modules/appeals/entities/appeal.entity';

describe('CreateAppealDto', () => {
  it('accepts the appeal creation form payload including librarian target role', async () => {
    const errors = await validateDto(CreateAppealDto, {
      fullName: 'Ali Valiyev',
      phone: '+998901234567',
      type: AppealType.SUGGESTION,
      targetRole: TargetRole.LIBRARIAN,
      description: 'Kutubxona kitoblarini yangilash bo‘yicha taklif.',
      source: AppealSource.PUBLIC_LINK,
    });

    expect(errors).toHaveLength(0);
  });

  it('rejects invalid appeal form fields and unknown properties', async () => {
    const errors = await validateDto(CreateAppealDto, {
      fullName: '',
      phone: '90123',
      type: 'idea',
      targetRole: 'owner',
      description: 'bad',
      source: 'telegram',
      extra: 'forbidden',
    });

    const serialized = JSON.stringify(errors);
    expect(serialized).toContain('fullName');
    expect(serialized).toContain('phone');
    expect(serialized).toContain('type');
    expect(serialized).toContain('targetRole');
    expect(serialized).toContain('description');
    expect(serialized).toContain('source');
    expect(serialized).toContain('extra');
  });
});

describe('UpdateAppealDto', () => {
  it('accepts partial status update payload', async () => {
    const errors = await validateDto(UpdateAppealDto, {
      status: AppealStatus.IN_PROGRESS,
      description: 'Murojaat masul xodimga biriktirildi.',
    });

    expect(errors).toHaveLength(0);
  });
});
