import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import type { Repository } from 'typeorm';
import { RoomsService } from '../src/modules/settings/rooms.service';
import type { Room } from '../src/modules/settings/entities/room.entity';

function makeRoom(overrides: Partial<Room> = {}): Room {
  return {
    id: 'f0ff63e5-9fc8-4a9a-83de-9453d328d0d7',
    floor: 1,
    roomNumber: '101',
    normalizedRoomNumber: '101',
    createdAt: new Date('2026-06-01T00:00:00Z'),
    updatedAt: new Date('2026-06-01T00:00:00Z'),
    deletedAt: null,
    version: 1,
    ...overrides,
  } as Room;
}

describe('RoomsService CRUD', () => {
  const roomId = 'f0ff63e5-9fc8-4a9a-83de-9453d328d0d7';

  let rooms: jest.Mocked<
    Pick<Repository<Room>, 'create' | 'save' | 'find' | 'findOne' | 'softDelete'>
  >;
  let service: RoomsService;

  beforeEach(() => {
    rooms = {
      create: jest.fn(),
      save: jest.fn(),
      find: jest.fn(),
      findOne: jest.fn(),
      softDelete: jest.fn(),
    };

    service = new RoomsService(rooms as unknown as Repository<Room>);
  });

  it('creates a room with a normalized unique number and floor label', async () => {
    rooms.findOne.mockResolvedValue(null);
    rooms.create.mockImplementation((value) => value as Room);
    rooms.save.mockImplementation(async (value) => ({ id: roomId, ...value }) as Room);

    const result = await service.createRoom({
      floor: 1,
      roomNumber: ' 101 ',
    });

    expect(result).toMatchObject({
      id: roomId,
      floor: 1,
      floorLabel: '1-Qavat',
      roomNumber: '101',
    });
    expect(rooms.create).toHaveBeenCalledWith({
      floor: 1,
      roomNumber: '101',
      normalizedRoomNumber: '101',
    });
  });

  it('rejects duplicate active room numbers', async () => {
    rooms.findOne.mockResolvedValue(makeRoom());

    await expect(
      service.createRoom({
        floor: 1,
        roomNumber: '101',
      }),
    ).rejects.toBeInstanceOf(ConflictException);

    expect(rooms.create).not.toHaveBeenCalled();
  });

  it('returns items array and stats when listing rooms', async () => {
    const room102 = makeRoom({ id: 'aaa', floor: 2, roomNumber: '201', normalizedRoomNumber: '201' });
    const room101 = makeRoom();
    rooms.find
      .mockResolvedValueOnce([room101]) // filtered query
      .mockResolvedValueOnce([room101, room102]); // all-rooms stats query

    const result = await service.findRooms({ floor: 1 });

    expect(result.items).toHaveLength(1);
    expect(result.items[0].floor).toBe(1);
    expect(result.stats.total).toBe(2);
    expect(result.stats.totalFloors).toBe(2);
    expect(result.stats.addedToday).toBe(0);
  });

  it('counts addedToday from rooms created today', async () => {
    const todayRoom = makeRoom({ createdAt: new Date() });
    rooms.find
      .mockResolvedValueOnce([todayRoom])
      .mockResolvedValueOnce([todayRoom]);

    const result = await service.findRooms();

    expect(result.stats.addedToday).toBe(1);
  });

  it('throws NotFoundException when a room does not exist', async () => {
    rooms.findOne.mockResolvedValue(null);

    await expect(service.findRoom(roomId)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('updates an existing room and refreshes its normalized number', async () => {
    const existing = makeRoom();
    rooms.findOne.mockResolvedValueOnce(existing).mockResolvedValueOnce(null);
    rooms.save.mockImplementation(async (value) => value as Room);

    const result = await service.updateRoom(roomId, {
      floor: 2,
      roomNumber: 'Lab-2',
    });

    expect(result).toMatchObject({
      floor: 2,
      floorLabel: '2-Qavat',
      roomNumber: 'Lab-2',
    });
    expect(existing).toMatchObject({
      floor: 2,
      roomNumber: 'Lab-2',
      normalizedRoomNumber: 'LAB-2',
    });
    expect(rooms.save).toHaveBeenCalledWith(existing);
  });

  it('rejects empty update payloads', async () => {
    await expect(service.updateRoom(roomId, {})).rejects.toBeInstanceOf(BadRequestException);

    expect(rooms.findOne).not.toHaveBeenCalled();
  });

  it('soft deletes an existing room', async () => {
    rooms.findOne.mockResolvedValue(makeRoom());
    rooms.softDelete.mockResolvedValue({ affected: 1, raw: {}, generatedMaps: [] });

    await service.deleteRoom(roomId);

    expect(rooms.softDelete).toHaveBeenCalledWith(roomId);
  });
});
