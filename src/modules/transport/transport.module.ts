import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RouteStop } from './entities/route-stop.entity';
import { StudentTransportAssignment } from './entities/student-transport.entity';
import { TransportRoute } from './entities/route.entity';
import { TransportTrip } from './entities/transport-trip.entity';
import { Vehicle } from './entities/vehicle.entity';
import { TransportController } from './transport.controller';
import { TransportService } from './transport.service';

@Module({ imports: [TypeOrmModule.forFeature([Vehicle, TransportRoute, RouteStop, StudentTransportAssignment, TransportTrip])], controllers: [TransportController], providers: [TransportService], exports: [TransportService] })
export class TransportModule {}
