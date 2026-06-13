import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateContractDto } from './dto/create-contract.dto';
import { RecordPaymentDto } from './dto/record-payment.dto';
import { Contract } from './entities/contract.entity';
import { Payment } from './entities/payment.entity';

@Injectable()
export class FinanceService {
  constructor(
    @InjectRepository(Contract)
    private readonly contracts: Repository<Contract>,
    @InjectRepository(Payment)
    private readonly payments: Repository<Payment>,
  ) {}

  createContract(dto: CreateContractDto): Promise<Contract> {
    return this.contracts.save(this.contracts.create(dto));
  }

  findContracts(): Promise<Contract[]> {
    return this.contracts.find({
      relations: { student: true, contractType: true },
      order: { createdAt: 'DESC' },
    });
  }

  async recordPayment(contractId: string, dto: RecordPaymentDto): Promise<Payment> {
    const contract = await this.contracts.findOne({ where: { id: contractId } });
    if (!contract) {
      throw new NotFoundException('Contract not found');
    }

    return this.payments.save(this.payments.create({ ...dto, contractId }));
  }

  async getDebt(contractId: string): Promise<{ contractId: string; totalAmount: number; paid: number; debt: number }> {
    const contract = await this.contracts.findOne({
      where: { id: contractId },
      relations: { payments: true },
    });
    if (!contract) {
      throw new NotFoundException('Contract not found');
    }

    const totalAmount = Number(contract.totalAmount);
    const paid = contract.payments?.reduce((sum, payment) => sum + Number(payment.amount), 0) ?? 0;

    return {
      contractId,
      totalAmount,
      paid,
      debt: Math.max(totalAmount - paid, 0),
    };
  }
}
