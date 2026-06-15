import { validateDto } from '../src/common/validation/validate-dto';
import { CreateLeadDto } from '../src/modules/crm/dto/create-lead.dto';
import { CreateSourceDto } from '../src/modules/crm/dto/create-source.dto';
import { LeadStatus } from '../src/modules/crm/enums/lead-status.enum';

describe('CreateLeadDto', () => {
  it('accepts a production-ready lead payload', async () => {
    const errors = await validateDto(CreateLeadDto, {
      firstName: 'Nodir',
      lastName: 'Toshmatov',
      phone: '+998901234567',
      email: 'parent@example.com',
      status: LeadStatus.NEW,
    });
    expect(errors).toHaveLength(0);
  });

  it('rejects an invalid phone, status, email and unknown properties', async () => {
    const errors = await validateDto(CreateLeadDto, {
      firstName: 'Nodir',
      phone: 'not-a-phone',
      email: 'broken',
      status: 'archived',
      extra: 'forbidden',
    });
    const serialized = JSON.stringify(errors);
    expect(serialized).toContain('phone');
    expect(serialized).toContain('email');
    expect(serialized).toContain('status');
    expect(serialized).toContain('extra');
  });
});

describe('CreateSourceDto', () => {
  it('accepts a source name', async () => {
    const errors = await validateDto(CreateSourceDto, { name: 'Instagram' });
    expect(errors).toHaveLength(0);
  });

  it('rejects an empty name and unknown properties', async () => {
    const errors = await validateDto(CreateSourceDto, { name: '', extra: 'x' });
    const serialized = JSON.stringify(errors);
    expect(serialized).toContain('name');
    expect(serialized).toContain('extra');
  });
});
