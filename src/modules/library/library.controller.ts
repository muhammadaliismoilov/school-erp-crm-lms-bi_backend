import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AppPermission } from '../../common/constants/permissions';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { UuidParamDto } from '../../common/dto/uuid-param.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { CreateLibraryBookDto, UpdateLibraryBookDto, CreateLibraryBookCopyDto, UpdateLibraryBookCopyDto, CreateLibraryLoanDto, UpdateLibraryLoanDto, CreateLibraryReservationDto, UpdateLibraryReservationDto } from './dto/library.dto';
import { LibraryService } from './library.service';

@ApiTags('Library')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller({ path: 'library', version: '1' })
export class LibraryController {
  constructor(private readonly service: LibraryService) {}

  @Get('books')
  @Permissions([AppPermission.LIBRARY_BOOKS_READ])
  findBooks() { return this.service.findBooks(); }

  @Post('books')
  @Permissions([AppPermission.LIBRARY_BOOKS_CREATE])
  createBooks(@Body() dto: CreateLibraryBookDto) { return this.service.createBooks(dto); }

  @Patch('books/:id')
  @Permissions([AppPermission.LIBRARY_BOOKS_UPDATE])
  updateBooks(@Param() params: UuidParamDto, @Body() dto: UpdateLibraryBookDto) { return this.service.updateBooks(params.id, dto); }

  @Get('copies')
  @Permissions([AppPermission.LIBRARY_COPIES_READ])
  findCopies() { return this.service.findCopies(); }

  @Post('copies')
  @Permissions([AppPermission.LIBRARY_COPIES_CREATE])
  createCopies(@Body() dto: CreateLibraryBookCopyDto) { return this.service.createCopies(dto); }

  @Patch('copies/:id')
  @Permissions([AppPermission.LIBRARY_COPIES_UPDATE])
  updateCopies(@Param() params: UuidParamDto, @Body() dto: UpdateLibraryBookCopyDto) { return this.service.updateCopies(params.id, dto); }

  @Get('loans')
  @Permissions([AppPermission.LIBRARY_LOANS_READ])
  findLoans() { return this.service.findLoans(); }

  @Post('loans')
  @Permissions([AppPermission.LIBRARY_LOANS_CREATE])
  createLoans(@Body() dto: CreateLibraryLoanDto) { return this.service.createLoans(dto); }

  @Patch('loans/:id')
  @Permissions([AppPermission.LIBRARY_LOANS_UPDATE])
  updateLoans(@Param() params: UuidParamDto, @Body() dto: UpdateLibraryLoanDto) { return this.service.updateLoans(params.id, dto); }

  @Get('reservations')
  @Permissions([AppPermission.LIBRARY_RESERVATIONS_READ])
  findReservations() { return this.service.findReservations(); }

  @Post('reservations')
  @Permissions([AppPermission.LIBRARY_RESERVATIONS_CREATE])
  createReservations(@Body() dto: CreateLibraryReservationDto) { return this.service.createReservations(dto); }

  @Patch('reservations/:id')
  @Permissions([AppPermission.LIBRARY_RESERVATIONS_UPDATE])
  updateReservations(@Param() params: UuidParamDto, @Body() dto: UpdateLibraryReservationDto) { return this.service.updateReservations(params.id, dto); }
}
