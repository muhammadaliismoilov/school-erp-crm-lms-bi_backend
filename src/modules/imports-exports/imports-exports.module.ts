import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataJob } from './entities/data-job.entity';
import { ImportsExportsController } from './imports-exports.controller';
import { ImportsExportsService } from './imports-exports.service';

@Module({ imports: [TypeOrmModule.forFeature([DataJob])], controllers: [ImportsExportsController], providers: [ImportsExportsService], exports: [ImportsExportsService] })
export class ImportsExportsModule {}
