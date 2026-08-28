import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CommonStatus } from '../../../common/enums/common-status.enum';
import { UserGender } from '../enums/user.enums';

export class UserRoleSchema {
  @ApiProperty({ example: 'teacher' })
  name: string;

  @ApiPropertyOptional({ example: "O'qituvchi", nullable: true })
  title?: string | null;
}

export class UserResponseSchema {
  @ApiProperty({ example: '2ec0e170-8249-4c79-9dc7-5ec7faeeb3e9', format: 'uuid' })
  id: string;

  @ApiProperty({ example: 'javohir.aliyev' })
  login: string;

  @ApiProperty({ example: 'Javohir Aliyev' })
  fullName: string;

  @ApiProperty({ example: 'Javohir' })
  firstName: string;

  @ApiProperty({ example: 'Жавоҳир' })
  firstNameCyrillic: string;

  @ApiProperty({ example: 'Aliyev' })
  lastName: string;

  @ApiProperty({ example: 'Алиев' })
  lastNameCyrillic: string;

  @ApiPropertyOptional({ example: 'Valiyevich', nullable: true })
  middleName?: string | null;

  @ApiPropertyOptional({ example: 'Валиевич', nullable: true })
  middleNameCyrillic?: string | null;

  @ApiPropertyOptional({ example: '2000-01-15', format: 'date', nullable: true })
  birthDate?: string | null;

  @ApiPropertyOptional({ example: 'AB1234567', nullable: true })
  documentNumber?: string | null;

  @ApiProperty({ enum: UserGender, example: UserGender.MALE })
  gender: UserGender;

  @ApiPropertyOptional({ example: '+998901234567', nullable: true })
  phone?: string | null;

  @ApiPropertyOptional({ example: 'javohir@example.uz', nullable: true })
  email?: string | null;

  @ApiPropertyOptional({ example: '12345678901234', nullable: true })
  pinfl?: string | null;

  @ApiPropertyOptional({ example: 'Yuton maktabi', nullable: true })
  workplace?: string | null;

  @ApiPropertyOptional({ example: 'https://cdn.example.uz/users/javohir.png', nullable: true })
  profileImageUrl?: string | null;

  @ApiPropertyOptional({ example: '8cf35a94-92b4-4f1a-8a7a-90a78003892d', format: 'uuid', nullable: true })
  profileImageFileId?: string | null;

  @ApiPropertyOptional({ format: 'uuid', nullable: true, description: 'Foydalanuvchi maktabi (tenant).' })
  schoolId?: string | null;

  @ApiPropertyOptional({ format: 'uuid', nullable: true, description: 'Foydalanuvchi filiali.' })
  branchId?: string | null;

  @ApiPropertyOptional({ example: 'teacher', nullable: true })
  role?: string | null;

  @ApiProperty({ type: [UserRoleSchema] })
  roles: UserRoleSchema[];

  @ApiProperty({ enum: CommonStatus, example: CommonStatus.ACTIVE })
  status: CommonStatus;

  @ApiPropertyOptional({ example: '2026-06-08T00:00:00.000Z', format: 'date-time' })
  createdAt?: string;

  @ApiPropertyOptional({ example: '2026-06-08T00:00:00.000Z', format: 'date-time' })
  updatedAt?: string;

  @ApiPropertyOptional({ example: 1 })
  version?: number;
}

export class UserPageMetaSchema {
  @ApiProperty({ example: 1 })
  page: number;

  @ApiProperty({ example: 20 })
  limit: number;

  @ApiProperty({ example: 3 })
  total: number;

  @ApiProperty({ example: 1 })
  pageCount: number;
}

export class UserStatsSchema {
  @ApiProperty({
    description:
      "Login hisoblari soni (aktiv maktab bo'yicha). O'quvchilar bu songa " +
      "KIRMAYDI — ularda login hisobi yo'q, ular alohida `students` jadvalida.",
    example: 210,
  })
  accountCount: number;

  @ApiProperty({
    description: "O'quvchilar soni. `accountCount` bilan KESISHMAYDI.",
    example: 200,
  })
  studentCount: number;

  @ApiProperty({
    description: 'Oxirgi 30 kunda kamida bir marta kirgan hisoblar.',
    example: 10,
  })
  activeCount: number;

  @ApiProperty({ example: 1 })
  pageCount: number;
}

export class SchoolUserBreakdownRowSchema {
  @ApiProperty({ description: "Maktab IDsi. `null` — maktabga bog'lanmagan global hisoblar.", nullable: true })
  schoolId: string | null;

  @ApiProperty({ example: 'Elegant School' })
  name: string;

  @ApiProperty({ example: 210 })
  accounts: number;

  @ApiProperty({ example: 200 })
  students: number;

  @ApiProperty({ example: 1 })
  active: number;
}

export class UserListResponseSchema {
  @ApiProperty({ type: [UserResponseSchema] })
  items: UserResponseSchema[];

  @ApiProperty({ type: UserPageMetaSchema })
  meta: UserPageMetaSchema;

  @ApiProperty({ type: UserStatsSchema })
  stats: UserStatsSchema;
}

export class UserErrorResponseSchema {
  @ApiProperty({ example: false })
  success: false;

  @ApiProperty({
    example: {
      code: 'USER_NOT_FOUND',
      message: 'Foydalanuvchi topilmadi',
      details: [],
    },
  })
  error: {
    code: string;
    message: string;
    details?: unknown[];
  };

  @ApiProperty({ example: 404 })
  statusCode: number;

  @ApiProperty({ example: '2026-06-08T00:00:00.000Z', format: 'date-time' })
  timestamp: string;
}
