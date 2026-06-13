import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LibraryBook } from './entities/library-book.entity';
import { LibraryBookCopy } from './entities/library-book-copy.entity';
import { LibraryLoan } from './entities/library-loan.entity';
import { LibraryReservation } from './entities/library-reservation.entity';
import { LibraryController } from './library.controller';
import { LibraryService } from './library.service';

@Module({ imports: [TypeOrmModule.forFeature([LibraryBook, LibraryBookCopy, LibraryLoan, LibraryReservation])], controllers: [LibraryController], providers: [LibraryService], exports: [LibraryService] })
export class LibraryModule {}
