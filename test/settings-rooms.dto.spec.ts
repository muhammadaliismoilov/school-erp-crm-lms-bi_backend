import { validateDto } from '../src/common/validation/validate-dto';
import { CreateRoomDto } from '../src/modules/settings/dto/create-room.dto';

describe('CreateRoomDto', () => {
  it('accepts a production-ready room payload', async () => {
    const errors = await validateDto(CreateRoomDto, {
      floor: 1,
      roomNumber: '101',
    });

    expect(errors).toHaveLength(0);
  });

  it('rejects invalid room fields and unknown properties', async () => {
    const errors = await validateDto(CreateRoomDto, {
      floor: 0,
      roomNumber: '   ',
      extra: 'forbidden',
    });

    const serialized = JSON.stringify(errors);
    expect(serialized).toContain('floor');
    expect(serialized).toContain('roomNumber');
    expect(serialized).toContain('extra');
  });
});
