import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LibraryBook } from './entities/library-book.entity';
import { LibraryBookCopy } from './entities/library-book-copy.entity';
import { LibraryLoan } from './entities/library-loan.entity';
import { LibraryReservation } from './entities/library-reservation.entity';
import { CreateLibraryBookDto, UpdateLibraryBookDto, CreateLibraryBookCopyDto, UpdateLibraryBookCopyDto, CreateLibraryLoanDto, UpdateLibraryLoanDto, CreateLibraryReservationDto, UpdateLibraryReservationDto } from './dto/library.dto';

@Injectable()
export class LibraryService {
  constructor(@InjectRepository(LibraryBook) private readonly books: Repository<LibraryBook>, @InjectRepository(LibraryBookCopy) private readonly copies: Repository<LibraryBookCopy>, @InjectRepository(LibraryLoan) private readonly loans: Repository<LibraryLoan>, @InjectRepository(LibraryReservation) private readonly reservations: Repository<LibraryReservation>) {}

  findBooks() { return this.books.find({ order: { createdAt: 'DESC' } }); }
  createBooks(dto: CreateLibraryBookDto) { return this.books.save(this.books.create(dto)); }
  async updateBooks(id: string, dto: UpdateLibraryBookDto) { const entity = await this.books.preload({ id, ...dto }); if (!entity) throw new NotFoundException('LibraryBook not found'); return this.books.save(entity); }

  findCopies() { return this.copies.find({ order: { createdAt: 'DESC' } }); }
  createCopies(dto: CreateLibraryBookCopyDto) { return this.copies.save(this.copies.create(dto)); }
  async updateCopies(id: string, dto: UpdateLibraryBookCopyDto) { const entity = await this.copies.preload({ id, ...dto }); if (!entity) throw new NotFoundException('LibraryBookCopy not found'); return this.copies.save(entity); }

  findLoans() { return this.loans.find({ order: { createdAt: 'DESC' } }); }
  createLoans(dto: CreateLibraryLoanDto) { return this.loans.save(this.loans.create(dto)); }
  async updateLoans(id: string, dto: UpdateLibraryLoanDto) { const entity = await this.loans.preload({ id, ...dto }); if (!entity) throw new NotFoundException('LibraryLoan not found'); return this.loans.save(entity); }

  findReservations() { return this.reservations.find({ order: { createdAt: 'DESC' } }); }
  createReservations(dto: CreateLibraryReservationDto) { return this.reservations.save(this.reservations.create(dto)); }
  async updateReservations(id: string, dto: UpdateLibraryReservationDto) { const entity = await this.reservations.preload({ id, ...dto }); if (!entity) throw new NotFoundException('LibraryReservation not found'); return this.reservations.save(entity); }
}
