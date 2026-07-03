import { Column, Entity, Index } from 'typeorm';
import { UuidAuditEntity } from '../../../common/entities/abstract.entity';
import { MealType } from '../enums/youth-services.enums';

@Entity('youth_meal_menus')
@Index('idx_youth_meal_menus_date', ['menuDate'])
export class MealMenu extends UuidAuditEntity {
  @Column({ name: 'school_id', type: 'uuid', nullable: true }) schoolId?: string | null;
  @Column({ name: 'filial_id', type: 'uuid', nullable: true }) filialId?: string | null;
  @Column({ name: 'menu_date', type: 'date' }) menuDate: string;
  @Column({ type: 'enum', enum: MealType }) mealType: MealType;
  @Column({ type: 'varchar', length: 160 }) title: string;
  @Column({ type: 'text', nullable: true }) description?: string | null;
  @Column({ name: 'calories', type: 'int', nullable: true }) calories?: number | null;
  @Column({ name: 'allergens', type: 'jsonb', default: '[]' }) allergens: string[];
}
