import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { UuidAuditEntity } from '../../../common/entities/abstract.entity';
import { Student } from '../../students/entities/student.entity';
import { ServiceRequestStatus } from '../enums/youth-services.enums';

@Entity('youth_service_requests')
@Index('idx_youth_service_requests_student', ['studentId'])
@Index('idx_youth_service_requests_status', ['status'])
export class YouthServiceRequest extends UuidAuditEntity {
  @Column({ name: 'school_id', type: 'uuid', nullable: true }) schoolId?: string | null;
  @Column({ name: 'filial_id', type: 'uuid', nullable: true }) filialId?: string | null;
  @Column({ name: 'student_id', type: 'uuid', nullable: true }) studentId?: string | null;
  @ManyToOne(() => Student, { nullable: true, onDelete: 'SET NULL' }) @JoinColumn({ name: 'student_id' }) student?: Student | null;
  @Column({ type: 'varchar', length: 100 }) category: string;
  @Column({ type: 'varchar', length: 160 }) title: string;
  @Column({ type: 'text' }) description: string;
  @Column({ type: 'enum', enum: ServiceRequestStatus, default: ServiceRequestStatus.OPEN }) status: ServiceRequestStatus;
  @Column({ name: 'resolved_at', type: 'timestamptz', nullable: true }) resolvedAt?: Date | null;
}
