import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TenantContextService } from '../../common/tenant/tenant-context.service';
import { tenantWhere } from '../../common/tenant/tenant-scope.util';
import { AssignStudentTransportDto, CreateRouteDto, CreateRouteStopDto, CreateTransportTripDto, CreateVehicleDto, UpdateRouteDto, UpdateRouteStopDto, UpdateTransportTripDto, UpdateVehicleDto } from './dto/transport.dto';
import { RouteStop } from './entities/route-stop.entity';
import { StudentTransportAssignment } from './entities/student-transport.entity';
import { TransportRoute } from './entities/route.entity';
import { TransportTrip } from './entities/transport-trip.entity';
import { Vehicle } from './entities/vehicle.entity';

@Injectable()
export class TransportService {
  constructor(@InjectRepository(Vehicle) private readonly vehicles: Repository<Vehicle>, @InjectRepository(TransportRoute) private readonly routes: Repository<TransportRoute>, @InjectRepository(RouteStop) private readonly stops: Repository<RouteStop>, @InjectRepository(StudentTransportAssignment) private readonly assignments: Repository<StudentTransportAssignment>, @InjectRepository(TransportTrip) private readonly trips: Repository<TransportTrip>, private readonly tenant: TenantContextService) {}
  findVehicles() { return this.vehicles.find({ where: tenantWhere<Vehicle>(this.tenant, {}, { branch: true }), order: { createdAt: 'DESC' } }); }
  createVehicle(dto: CreateVehicleDto) { return this.vehicles.save(this.vehicles.create(dto)); }
  async updateVehicle(id: string, dto: UpdateVehicleDto) { const e = await this.vehicles.preload({ id, ...dto }); if (!e) throw new NotFoundException('Vehicle not found'); return this.vehicles.save(e); }
  findRoutes() { return this.routes.find({ where: tenantWhere<TransportRoute>(this.tenant, {}, { branch: true }), order: { createdAt: 'DESC' } }); }
  createRoute(dto: CreateRouteDto) { return this.routes.save(this.routes.create(dto)); }
  async updateRoute(id: string, dto: UpdateRouteDto) { const e = await this.routes.preload({ id, ...dto }); if (!e) throw new NotFoundException('Route not found'); return this.routes.save(e); }
  findStops(routeId?: string) { return this.stops.find({ where: tenantWhere<RouteStop>(this.tenant, routeId ? { routeId } : {}, { branch: true }), order: { orderIndex: 'ASC' } }); }
  createStop(dto: CreateRouteStopDto) { return this.stops.save(this.stops.create(dto)); }
  async updateStop(id: string, dto: UpdateRouteStopDto) { const e = await this.stops.preload({ id, ...dto }); if (!e) throw new NotFoundException('Route stop not found'); return this.stops.save(e); }
  findAssignments(routeId?: string) { return this.assignments.find({ where: tenantWhere<StudentTransportAssignment>(this.tenant, routeId ? { routeId } : {}, { branch: true }), order: { createdAt: 'DESC' } }); }
  async assignStudent(dto: AssignStudentTransportDto) { const existing = await this.assignments.findOne({ where: tenantWhere<StudentTransportAssignment>(this.tenant, { studentId: dto.studentId }, { branch: true }) }); return this.assignments.save(existing ? { ...existing, ...dto } : this.assignments.create(dto)); }
  findTrips(routeId?: string) { return this.trips.find({ where: tenantWhere<TransportTrip>(this.tenant, routeId ? { routeId } : {}, { branch: true }), order: { tripDate: 'DESC' } }); }
  createTrip(dto: CreateTransportTripDto) { return this.trips.save(this.trips.create({ ...dto, tripDate: dto.tripDate.slice(0, 10) })); }
  async updateTrip(id: string, dto: UpdateTransportTripDto) { const e = await this.trips.preload({ id, ...dto, tripDate: dto.tripDate ? dto.tripDate.slice(0, 10) : undefined }); if (!e) throw new NotFoundException('Transport trip not found'); return this.trips.save(e); }
}
