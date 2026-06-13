import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MealMenu } from './entities/meal-menu.entity';
import { YouthServiceRequest } from './entities/service-request.entity';
import { YouthServicesController } from './youth-services.controller';
import { YouthServicesService } from './youth-services.service';

@Module({ imports: [TypeOrmModule.forFeature([MealMenu, YouthServiceRequest])], controllers: [YouthServicesController], providers: [YouthServicesService], exports: [YouthServicesService] })
export class YouthServicesModule {}
