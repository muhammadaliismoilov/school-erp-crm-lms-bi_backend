import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { School } from '../settings/entities/school.entity';
import { SchoolModule as SchoolModuleEntity } from './entities/school-module.entity';
import { SchoolModulesService } from './school-modules.service';
import { SchoolModuleGuard } from './school-module.guard';
import { PublicSchoolsController } from './public-schools.controller';
import { SchoolsController } from './schools.controller';
import { SchoolsService } from './schools.service';

@Module({
  imports: [TypeOrmModule.forFeature([School, SchoolModuleEntity])],
  controllers: [SchoolsController, PublicSchoolsController],
  providers: [SchoolsService, SchoolModulesService, SchoolModuleGuard],
  exports: [SchoolsService, SchoolModulesService, SchoolModuleGuard],
})
export class SchoolsModule {}
