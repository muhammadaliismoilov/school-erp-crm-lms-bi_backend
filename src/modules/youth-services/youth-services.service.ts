import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, Repository } from 'typeorm';
import { TenantContextService } from '../../common/tenant/tenant-context.service';
import { tenantWhere } from '../../common/tenant/tenant-scope.util';
import { CreateMealMenuDto, CreateYouthServiceRequestDto, UpdateMealMenuDto, UpdateYouthServiceRequestDto } from './dto/youth-services.dto';
import { MealMenu } from './entities/meal-menu.entity';
import { YouthServiceRequest } from './entities/service-request.entity';
import { ServiceRequestStatus } from './enums/youth-services.enums';

@Injectable()
export class YouthServicesService {
  constructor(@InjectRepository(MealMenu) private readonly menus: Repository<MealMenu>, @InjectRepository(YouthServiceRequest) private readonly requests: Repository<YouthServiceRequest>, private readonly tenant: TenantContextService) {}
  createMenu(dto: CreateMealMenuDto) { return this.menus.save(this.menus.create({ ...dto, allergens: dto.allergens ?? [] })); }
  findMenus() { return this.menus.find({ where: tenantWhere<MealMenu>(this.tenant, {}, { branch: true }), order: { menuDate: 'DESC', createdAt: 'DESC' } }); }
  updateMenu(id: string, dto: UpdateMealMenuDto) { return this.update(this.menus, id, dto); }
  createRequest(dto: CreateYouthServiceRequestDto) { return this.requests.save(this.requests.create(dto)); }
  findRequests() { return this.requests.find({ where: tenantWhere<YouthServiceRequest>(this.tenant, {}, { branch: true }), relations: { student: true }, order: { createdAt: 'DESC' } }); }
  async updateRequest(id: string, dto: UpdateYouthServiceRequestDto) { const entity = await this.findOneOrFail(this.requests, id); Object.assign(entity, dto); if (dto.status === ServiceRequestStatus.CLOSED && !entity.resolvedAt) entity.resolvedAt = new Date(); return this.requests.save(entity); }
  private async update<T extends { id: string }>(repo: Repository<T>, id: string, dto: Partial<T>) { const entity = await this.findOneOrFail(repo, id); Object.assign(entity, dto); return repo.save(entity); }
  private async findOneOrFail<T extends { id: string }>(repo: Repository<T>, id: string): Promise<T> { const entity = await repo.findOne({ where: tenantWhere<T>(this.tenant, { id } as FindOptionsWhere<T>, { branch: true }) }); if (!entity) throw new NotFoundException('Resource not found'); return entity; }
}
