import { Column, Entity, Index } from 'typeorm';
import { UuidAuditEntity } from '../../../common/entities/abstract.entity';

@Entity('face_profiles')
@Index(['personType', 'personId'], { unique: true, where: 'deleted_at IS NULL' })
export class FaceProfile extends UuidAuditEntity {
  @Column({ name: 'school_id', type: 'uuid', nullable: true }) schoolId?: string | null;
  @Column({ name: 'filial_id', type: 'uuid', nullable: true }) filialId?: string | null;

  @Column({ name: 'person_type', length: 80 }) personType: string;
  @Column({ name: 'person_id', type: 'uuid' }) personId: string;
  @Column({ name: 'photo_url', type: 'text', nullable: true }) photoUrl?: string | null;
  @Column({ name: 'face_template_hash', type: 'varchar', length: 220, nullable: true }) faceTemplateHash?: string | null;
  @Column({ default: true }) active: boolean;
}
