import { validateDto } from '../src/common/validation/validate-dto';
import { CreateIntegrationDto } from '../src/modules/integrations/dto/create-integration.dto';
import { UpdateIntegrationDto } from '../src/modules/integrations/dto/update-integration.dto';
import {
  IntegrationCategory,
  IntegrationCode,
  OpenAiModel,
} from '../src/modules/integrations/entities/integration.entity';

describe('CreateIntegrationDto', () => {
  it('accepts OpenAI assistant setup form payload', async () => {
    const errors = await validateDto(CreateIntegrationDto, {
      name: 'OpenAI',
      code: IntegrationCode.OPENAI,
      description: 'AI yordamchi va matn generatsiya',
      category: IntegrationCategory.AI_ASSISTANTS,
      isEnabled: true,
      config: {
        apiKey: 'sk-proj-valid-secret',
        model: OpenAiModel.GPT_4O_MINI,
        enabled: true,
      },
    });

    expect(errors).toHaveLength(0);
  });

  it('accepts OnlinePBX telephony setup form payload', async () => {
    const errors = await validateDto(CreateIntegrationDto, {
      name: 'OnlinePBX',
      code: IntegrationCode.ONLINE_PBX,
      description: 'Telefoniya va call-center integratsiyasi',
      category: IntegrationCategory.TELEPHONY,
      isEnabled: true,
      config: {
        domain: 'u010686',
        apiKey: 'pbx-api-secret',
        webhookSecret: 'pbx-webhook-secret',
        phoneNumbers: ['+998901234567', '+998712345678'],
        widgetScriptUrl: 'https://callback3.onlinepbx.uz/?cb-id=demo',
      },
    });

    expect(errors).toHaveLength(0);
  });

  it('rejects unknown integration code and unknown properties', async () => {
    const errors = await validateDto(CreateIntegrationDto, {
      name: '',
      code: 'telegram',
      category: '',
      config: 'bad',
      extra: 'forbidden',
    });

    const serialized = JSON.stringify(errors);
    expect(serialized).toContain('name');
    expect(serialized).toContain('code');
    expect(serialized).toContain('category');
    expect(serialized).toContain('config');
    expect(serialized).toContain('extra');
  });
});

describe('UpdateIntegrationDto', () => {
  it('accepts partial integration settings update', async () => {
    const errors = await validateDto(UpdateIntegrationDto, {
      isEnabled: false,
      config: {
        apiKey: 'sk-proj-rotated',
        model: OpenAiModel.GPT_4O_MINI,
        enabled: false,
      },
    });

    expect(errors).toHaveLength(0);
  });
});
