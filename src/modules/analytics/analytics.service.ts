import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Contract } from '../finance/entities/contract.entity';
import { Payment } from '../finance/entities/payment.entity';
import { StaffMember } from '../hr/entities/staff-member.entity';
import { Student } from '../students/entities/student.entity';
import { User } from '../identity/entities/user.entity';
import { TenantContextService } from '../../common/tenant/tenant-context.service';
import { applyTenantScope, tenantWhere } from '../../common/tenant/tenant-scope.util';

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectRepository(Student) private readonly students: Repository<Student>,
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(Contract) private readonly contracts: Repository<Contract>,
    @InjectRepository(Payment) private readonly payments: Repository<Payment>,
    @InjectRepository(StaffMember) private readonly staff: Repository<StaffMember>,
    private readonly tenant: TenantContextService,
  ) {}

  async dashboard() {
    // Barcha metrikalar aktiv maktab/filial bo'yicha filtrlanadi (User faqat school_id).
    const paymentQb = this.payments.createQueryBuilder('payment').select('COALESCE(SUM(payment.amount), 0)', 'sum');
    applyTenantScope(paymentQb, 'payment', this.tenant, { branch: true });
    const contractQb = this.contracts.createQueryBuilder('contract').select('COALESCE(SUM(contract.total_amount), 0)', 'sum');
    applyTenantScope(contractQb, 'contract', this.tenant, { branch: true });

    const [studentsCount, usersCount, contractsCount, staffCount, paymentRaw, contractRaw] = await Promise.all([
      this.students.count({ where: tenantWhere<Student>(this.tenant, {}, { branch: true }) }),
      this.users.count({ where: tenantWhere<User>(this.tenant, {}) }),
      this.contracts.count({ where: tenantWhere<Contract>(this.tenant, {}, { branch: true }) }),
      this.staff.count({ where: tenantWhere<StaffMember>(this.tenant, {}, { branch: true }) }),
      paymentQb.getRawOne<{ sum: string }>(),
      contractQb.getRawOne<{ sum: string }>(),
    ]);
    const totalPayments = Number(paymentRaw?.sum ?? 0);
    const totalContracts = Number(contractRaw?.sum ?? 0);
    return { studentsCount, usersCount, contractsCount, staffCount, totalContracts, totalPayments, estimatedDebt: Math.max(totalContracts - totalPayments, 0) };
  }
}
