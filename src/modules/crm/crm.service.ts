import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { createPage, PageDto } from '../../common/dto/page.dto';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { CreateLeadDto } from './dto/create-lead.dto';
import { UpdateLeadDto } from './dto/update-lead.dto';
import { Lead } from './entities/lead.entity';

@Injectable()
export class CrmService {
  constructor(
    @InjectRepository(Lead)
    private readonly leads: Repository<Lead>,
  ) {}

  async createLead(dto: CreateLeadDto): Promise<Lead> {
    return this.leads.save(this.leads.create(dto));
  }

  async findLeads(query: PaginationQueryDto): Promise<PageDto<Lead>> {
    const qb = this.leads
      .createQueryBuilder('lead')
      .leftJoinAndSelect('lead.source', 'source')
      .leftJoinAndSelect('lead.stage', 'stage')
      .orderBy('lead.createdAt', 'DESC')
      .skip((query.page - 1) * query.limit)
      .take(query.limit);

    if (query.search) {
      qb.andWhere(
        '(lead.firstName ILIKE :search OR lead.lastName ILIKE :search OR lead.phone ILIKE :search)',
        { search: `%${query.search}%` },
      );
    }

    const [items, total] = await qb.getManyAndCount();
    return createPage(items, total, query.page, query.limit);
  }

  async findLead(id: string): Promise<Lead> {
    const lead = await this.leads.findOne({
      where: { id },
      relations: { source: true, stage: true, tasks: true, applications: true },
    });
    if (!lead) {
      throw new NotFoundException('Lead not found');
    }

    return lead;
  }

  async updateLead(id: string, dto: UpdateLeadDto): Promise<Lead> {
    const lead = await this.findLead(id);
    Object.assign(lead, dto);
    return this.leads.save(lead);
  }
}
