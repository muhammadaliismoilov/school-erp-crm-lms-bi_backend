import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Contract } from '../finance/entities/contract.entity';
import { Payment } from '../finance/entities/payment.entity';
import { StaffMember } from '../hr/entities/staff-member.entity';
import { Student } from '../students/entities/student.entity';
import { User } from '../identity/entities/user.entity';

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectRepository(Student) private readonly students: Repository<Student>,
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(Contract) private readonly contracts: Repository<Contract>,
    @InjectRepository(Payment) private readonly payments: Repository<Payment>,
    @InjectRepository(StaffMember) private readonly staff: Repository<StaffMember>,
  ) {}

  async dashboard() {
    const [studentsCount, usersCount, contractsCount, staffCount, paymentRaw, contractRaw] = await Promise.all([
      this.students.count(),
      this.users.count(),
      this.contracts.count(),
      this.staff.count(),
      this.payments.createQueryBuilder('payment').select('COALESCE(SUM(payment.amount), 0)', 'sum').getRawOne<{ sum: string }>(),
      this.contracts.createQueryBuilder('contract').select('COALESCE(SUM(contract.total_amount), 0)', 'sum').getRawOne<{ sum: string }>(),
    ]);
    const totalPayments = Number(paymentRaw?.sum ?? 0);
    const totalContracts = Number(contractRaw?.sum ?? 0);
    return { studentsCount, usersCount, contractsCount, staffCount, totalContracts, totalPayments, estimatedDebt: Math.max(totalContracts - totalPayments, 0) };
  }
}
