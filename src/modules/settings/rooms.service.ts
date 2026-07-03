import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindManyOptions, FindOptionsWhere, ILike, Not, Repository } from 'typeorm';
import { TenantContextService } from '../../common/tenant/tenant-context.service';
import { tenantWhere } from '../../common/tenant/tenant-scope.util';
import { CreateRoomDto } from './dto/create-room.dto';
import { RoomQueryDto } from './dto/room-query.dto';
import { RoomListResponseDto, RoomResponseDto } from './dto/room-response.dto';
import { UpdateRoomDto } from './dto/update-room.dto';
import { Room } from './entities/room.entity';

interface RoomSaveInput {
  floor: number;
  roomNumber: string;
  normalizedRoomNumber: string;
}

@Injectable()
export class RoomsService {
  constructor(
    @InjectRepository(Room)
    private readonly rooms: Repository<Room>,
    private readonly tenant: TenantContextService,
  ) {}

  async createRoom(dto: CreateRoomDto): Promise<RoomResponseDto> {
    const input = this.buildRoomInput(dto);
    await this.ensureRoomCanBeSaved(input);

    const room = await this.rooms.save(this.rooms.create(input));
    return this.toRoomResponse(room);
  }

  async findRooms(query: RoomQueryDto = {}): Promise<RoomListResponseDto> {
    const options: FindManyOptions<Room> = {
      order: { floor: 'ASC', normalizedRoomNumber: 'ASC' },
    };
    const where: FindOptionsWhere<Room> = {};

    if (query.floor !== undefined) {
      where.floor = query.floor;
    }

    if (query.search) {
      where.normalizedRoomNumber = ILike('%' + this.normalizeRoomNumber(query.search) + '%');
    }

    options.where = tenantWhere<Room>(this.tenant, where, { branch: true });

    const [filteredRooms, allRooms] = await Promise.all([
      this.rooms.find(options),
      this.rooms.find({ where: tenantWhere<Room>(this.tenant, {}, { branch: true }), select: ['floor', 'createdAt'] }),
    ]);

    const floorSet = new Set(allRooms.map((r) => r.floor));
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const addedToday = allRooms.filter((r) => r.createdAt && r.createdAt >= todayStart).length;

    return {
      items: filteredRooms.map((room) => this.toRoomResponse(room)),
      stats: {
        total: allRooms.length,
        totalFloors: floorSet.size,
        addedToday,
      },
    };
  }

  async findRoom(id: string): Promise<RoomResponseDto> {
    const room = await this.findRoomEntity(id);
    return this.toRoomResponse(room);
  }

  async updateRoom(id: string, dto: UpdateRoomDto): Promise<RoomResponseDto> {
    if (Object.keys(dto).length === 0) {
      throw new BadRequestException('At least one room field must be provided');
    }

    const room = await this.findRoomEntity(id);
    const input = this.buildRoomInput({
      floor: dto.floor ?? room.floor,
      roomNumber: dto.roomNumber ?? room.roomNumber,
    });

    await this.ensureRoomCanBeSaved(input, id);
    Object.assign(room, input);

    return this.toRoomResponse(await this.rooms.save(room));
  }

  async deleteRoom(id: string): Promise<void> {
    await this.findRoomEntity(id);
    await this.rooms.softDelete(id);
  }

  private buildRoomInput(dto: CreateRoomDto): RoomSaveInput {
    const roomNumber = this.sanitizeRoomNumber(dto.roomNumber);

    return {
      floor: dto.floor,
      roomNumber,
      normalizedRoomNumber: this.normalizeRoomNumber(roomNumber),
    };
  }

  private async ensureRoomCanBeSaved(
    input: RoomSaveInput,
    excludeRoomId?: string,
  ): Promise<void> {
    const excludedIdWhere = excludeRoomId ? { id: Not(excludeRoomId) } : {};
    // Xona raqami har maktab (va filial) ichida unikal bo'lishi kifoya.
    const duplicateRoom = await this.rooms.findOne({
      where: tenantWhere<Room>(this.tenant, {
        normalizedRoomNumber: input.normalizedRoomNumber,
        ...excludedIdWhere,
      }, { branch: true }),
    });

    if (duplicateRoom) {
      throw new ConflictException('Room number already exists');
    }
  }

  private async findRoomEntity(id: string): Promise<Room> {
    const room = await this.rooms.findOne({ where: tenantWhere<Room>(this.tenant, { id }, { branch: true }) });

    if (!room) {
      throw new NotFoundException('Room not found');
    }

    return room;
  }

  private toRoomResponse(room: Room): RoomResponseDto {
    return {
      id: room.id,
      roomNumber: room.roomNumber,
      floor: room.floor,
      floorLabel: this.buildFloorLabel(room.floor),
      createdAt: room.createdAt?.toISOString(),
      updatedAt: room.updatedAt?.toISOString(),
      version: room.version,
    };
  }

  private buildFloorLabel(floor: number): string {
    return floor + '-Qavat';
  }

  private sanitizeRoomNumber(value: string): string {
    return value.trim().replace(/\s+/g, ' ');
  }

  private normalizeRoomNumber(value: string): string {
    return this.sanitizeRoomNumber(value).toUpperCase();
  }
}
