import { BadRequestException, NotFoundException } from '@nestjs/common';
import type { Repository } from 'typeorm';
import { TransactionChangeRequestService } from '../src/modules/transactions/transaction-change-request.service';
import {
  TransactionChangeRequest,
  TransactionChangeRequestStatus,
  TransactionChangeRequestType,
} from '../src/modules/transactions/entities/transaction-change-request.entity';
import type { FinanceTransaction } from '../src/modules/finance/entities/transaction.entity';
import type { User } from '../src/modules/identity/entities/user.entity';

function makeRequest(overrides: Partial<TransactionChangeRequest> = {}): TransactionChangeRequest {
  return {
    id: 'req-1',
    transactionId: 'tx-1',
    requestType: TransactionChangeRequestType.UPDATE,
    proposedChanges: { amount: 750000 },
    txType: 'expense',
    txAmount: 500000,
    txDate: '2026-05-10',
    txPersonName: 'Aliyev Javohir',
    reason: 'Summa noto‘g‘ri',
    status: TransactionChangeRequestStatus.PENDING,
    requestedById: 'user-1',
    requestedByName: 'Requester',
    reviewedById: null,
    reviewedByName: null,
    reviewedAt: null,
    reviewNote: null,
    applied: false,
    createdAt: new Date('2026-06-01T00:00:00Z'),
    updatedAt: new Date('2026-06-01T00:00:00Z'),
    deletedAt: null,
    version: 1,
    ...overrides,
  } as TransactionChangeRequest;
}

function makeTx(overrides: Partial<FinanceTransaction> = {}): FinanceTransaction {
  return {
    id: 'tx-1',
    type: 'expense',
    amount: 500000,
    date: '2026-05-10',
    personName: 'Aliyev Javohir',
    ...overrides,
  } as FinanceTransaction;
}

describe('TransactionChangeRequestService', () => {
  let requests: jest.Mocked<Pick<Repository<TransactionChangeRequest>, 'create' | 'save' | 'findOne' | 'softDelete'>>;
  let transactions: jest.Mocked<Pick<Repository<FinanceTransaction>, 'findOne' | 'save' | 'softDelete'>>;
  let users: jest.Mocked<Pick<Repository<User>, 'findOne'>>;
  let audit: { log: jest.Mock };
  let service: TransactionChangeRequestService;

  beforeEach(() => {
    requests = {
      create: jest.fn().mockImplementation((v) => v),
      save: jest.fn().mockImplementation(async (v) => ({ id: 'req-1', ...v })),
      findOne: jest.fn(),
      softDelete: jest.fn(),
    };
    transactions = {
      findOne: jest.fn(),
      save: jest.fn().mockImplementation(async (v) => v),
      softDelete: jest.fn(),
    };
    users = { findOne: jest.fn().mockResolvedValue(null) };
    audit = { log: jest.fn().mockResolvedValue(undefined) };

    service = new TransactionChangeRequestService(
      requests as unknown as Repository<TransactionChangeRequest>,
      transactions as unknown as Repository<FinanceTransaction>,
      users as unknown as Repository<User>,
      audit as never,
    );
  });

  describe('create', () => {
    it('rejects when the target transaction does not exist', async () => {
      transactions.findOne.mockResolvedValue(null);
      await expect(
        service.create({
          transactionId: 'tx-x',
          requestType: TransactionChangeRequestType.DELETE,
          reason: 'test',
        }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('rejects an update request with no proposed changes', async () => {
      transactions.findOne.mockResolvedValue(makeTx());
      await expect(
        service.create({
          transactionId: 'tx-1',
          requestType: TransactionChangeRequestType.UPDATE,
          reason: 'test',
          proposedChanges: {},
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('snapshots the transaction and creates a pending request', async () => {
      transactions.findOne.mockResolvedValue(makeTx());
      const res = await service.create({
        transactionId: 'tx-1',
        requestType: TransactionChangeRequestType.DELETE,
        reason: 'Keraksiz yozuv',
      });
      expect(res.status).toBe('pending');
      expect(res.txAmount).toBe(500000);
      expect(res.requestType).toBe('delete');
    });
  });

  describe('review', () => {
    it('applies the proposed amount to the transaction on approve (update)', async () => {
      requests.findOne.mockResolvedValue(makeRequest());
      const tx = makeTx();
      transactions.findOne.mockResolvedValue(tx);

      const res = await service.review('req-1', { status: TransactionChangeRequestStatus.APPROVED });

      expect(transactions.save).toHaveBeenCalledTimes(1);
      expect(tx.amount).toBe(750000);
      expect(res.status).toBe('approved');
      expect(res.applied).toBe(true);
    });

    it('soft-deletes the transaction on approve (delete)', async () => {
      requests.findOne.mockResolvedValue(
        makeRequest({ requestType: TransactionChangeRequestType.DELETE, proposedChanges: null }),
      );
      transactions.findOne.mockResolvedValue(makeTx());

      const res = await service.review('req-1', { status: TransactionChangeRequestStatus.APPROVED });

      expect(transactions.softDelete).toHaveBeenCalledWith('tx-1');
      expect(res.applied).toBe(true);
    });

    it('does not touch the transaction on reject', async () => {
      requests.findOne.mockResolvedValue(makeRequest());
      const res = await service.review('req-1', {
        status: TransactionChangeRequestStatus.REJECTED,
        reviewNote: 'Asossiz',
      });
      expect(transactions.save).not.toHaveBeenCalled();
      expect(transactions.softDelete).not.toHaveBeenCalled();
      expect(res.status).toBe('rejected');
      expect(res.applied).toBe(false);
    });

    it('rejects reviewing an already reviewed request', async () => {
      requests.findOne.mockResolvedValue(makeRequest({ status: TransactionChangeRequestStatus.APPROVED }));
      await expect(
        service.review('req-1', { status: TransactionChangeRequestStatus.REJECTED }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });
});
