import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsRelations, FindOptionsWhere, Repository } from 'typeorm';
import { CreateDepartmentDto, CreateLeaveDto, CreatePayrollDto, CreatePositionDto, CreateStaffMemberDto, UpdateDepartmentDto, UpdateLeaveDto, UpdatePayrollDto, UpdatePositionDto, UpdateStaffMemberDto } from './dto/hr.dto';
import { Department } from './entities/department.entity';
import { Payroll } from './entities/payroll.entity';
import { Position } from './entities/position.entity';
import { StaffLeave } from './entities/staff-leave.entity';
import { StaffMember } from './entities/staff-member.entity';

@Injectable()
export class HrService {
  constructor(
    @InjectRepository(Department) private readonly departments: Repository<Department>,
    @InjectRepository(Position) private readonly positions: Repository<Position>,
    @InjectRepository(StaffMember) private readonly staffMembers: Repository<StaffMember>,
    @InjectRepository(StaffLeave) private readonly leaves: Repository<StaffLeave>,
    @InjectRepository(Payroll) private readonly payrolls: Repository<Payroll>,
  ) {}

  createDepartment(dto: CreateDepartmentDto) { return this.departments.save(this.departments.create(dto)); }
  findDepartments() { return this.departments.find({ order: { createdAt: 'DESC' } }); }
  async updateDepartment(id: string, dto: UpdateDepartmentDto) { return this.update(this.departments, id, dto); }

  createPosition(dto: CreatePositionDto) { return this.positions.save(this.positions.create(dto)); }
  findPositions() { return this.positions.find({ order: { createdAt: 'DESC' } }); }
  async updatePosition(id: string, dto: UpdatePositionDto) { return this.update(this.positions, id, dto); }

  createStaffMember(dto: CreateStaffMemberDto) { return this.staffMembers.save(this.staffMembers.create(dto)); }
  findStaffMembers() { return this.staffMembers.find({ relations: { department: true, position: true, user: true }, order: { createdAt: 'DESC' } }); }
  async getStaffMember(id: string) { return this.findOneOrFail(this.staffMembers, id, { department: true, position: true, user: true, leaves: true, payrolls: true }); }
  async updateStaffMember(id: string, dto: UpdateStaffMemberDto) { return this.update(this.staffMembers, id, dto); }

  createLeave(dto: CreateLeaveDto) { return this.leaves.save(this.leaves.create(dto)); }
  findLeaves() { return this.leaves.find({ relations: { staffMember: true }, order: { createdAt: 'DESC' } }); }
  async updateLeave(id: string, dto: UpdateLeaveDto) { return this.update(this.leaves, id, dto); }

  createPayroll(dto: CreatePayrollDto) {
    const bonus = dto.bonus ?? 0;
    const deduction = dto.deduction ?? 0;
    const netAmount = dto.baseAmount + bonus - deduction;
    return this.payrolls.save(this.payrolls.create({ ...dto, bonus, deduction, netAmount }));
  }
  findPayrolls() { return this.payrolls.find({ relations: { staffMember: true }, order: { period: 'DESC', createdAt: 'DESC' } }); }
  async updatePayroll(id: string, dto: UpdatePayrollDto) {
    const payroll = await this.findOneOrFail(this.payrolls, id);
    Object.assign(payroll, dto);
    const baseAmount = Number(payroll.baseAmount);
    const bonus = Number(payroll.bonus ?? 0);
    const deduction = Number(payroll.deduction ?? 0);
    payroll.netAmount = baseAmount + bonus - deduction;
    return this.payrolls.save(payroll);
  }

  private async update<T extends { id: string }>(repo: Repository<T>, id: string, dto: Partial<T>) {
    const entity = await this.findOneOrFail(repo, id);
    Object.assign(entity, dto);
    return repo.save(entity);
  }

  private async findOneOrFail<T extends { id: string }>(repo: Repository<T>, id: string, relations?: FindOptionsRelations<T>): Promise<T> {
    const entity = await repo.findOne({ where: { id } as FindOptionsWhere<T>, relations });
    if (!entity) throw new NotFoundException('Resource not found');
    return entity;
  }
}
