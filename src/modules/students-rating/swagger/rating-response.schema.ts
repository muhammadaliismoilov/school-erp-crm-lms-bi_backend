import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/** O'quvchining reyting trendi: o'smoqda / barqaror / pasaymoqda. */
export type RatingTrend = 'rising' | 'stable' | 'falling';

export class RatingRowSchema {
  @ApiProperty({ format: 'uuid' }) studentId: string;
  @ApiProperty({ example: 'Abdullayeva Hilola' }) studentName: string;
  @ApiPropertyOptional({ example: 'HA', nullable: true }) initials?: string | null;
  @ApiPropertyOptional({ format: 'uuid', nullable: true }) classId?: string | null;
  @ApiPropertyOptional({ example: '1A', nullable: true }) classLabel?: string | null;
  /** Kompozit umumiy ball (0–25): akademik baho + davomatdan hisoblanadi. */
  @ApiProperty({ example: 24 }) umumiyBall: number;
  /** O'rtacha 5-ballik baho (0 — baho yo'q bo'lsa). */
  @ApiProperty({ example: 0 }) ortachaBall: number;
  /** Davomat foizi (0–100). */
  @ApiProperty({ example: 95 }) davomat: number;
  @ApiProperty({ enum: ['rising', 'stable', 'falling'], example: 'stable' }) trend: RatingTrend;
}

export class RatingStatsSchema {
  @ApiProperty({ example: 10, description: 'Filtrlangan jami o‘quvchilar soni.' }) jamiOquvchi: number;
  @ApiProperty({ example: 23, description: 'O‘rtacha umumiy ball (0–25).' }) ortachaUmumiyBall: number;
  @ApiProperty({ example: 0, description: 'Reytingi o‘smoqda bo‘lgan o‘quvchilar ulushi (%).' }) osishTrendi: number;
}

export class RatingPageMetaSchema {
  @ApiProperty({ example: 1 }) page: number;
  @ApiProperty({ example: 20 }) limit: number;
  @ApiProperty({ example: 10 }) total: number;
  @ApiProperty({ example: 1 }) pageCount: number;
}

export class RatingListResponseSchema {
  @ApiProperty({ type: [RatingRowSchema] }) items: RatingRowSchema[];
  @ApiProperty({ type: RatingPageMetaSchema }) meta: RatingPageMetaSchema;
  @ApiProperty({ type: RatingStatsSchema }) stats: RatingStatsSchema;
}

export class RatingLeaderSchema {
  @ApiProperty({ example: 1 }) rank: number;
  @ApiProperty({ format: 'uuid' }) studentId: string;
  @ApiProperty({ example: 'Rahimova Nigora' }) studentName: string;
  @ApiPropertyOptional({ example: 'NR', nullable: true }) initials?: string | null;
  @ApiPropertyOptional({ example: '1B', nullable: true }) classLabel?: string | null;
  @ApiProperty({ example: 25 }) umumiyBall: number;
  @ApiProperty({ enum: ['rising', 'stable', 'falling'], example: 'stable' }) trend: RatingTrend;
}

export class RatingLeadersResponseSchema {
  @ApiProperty({ type: [RatingLeaderSchema], description: 'Podium uchun dastlabki 3 o‘quvchi.' })
  podium: RatingLeaderSchema[];
  @ApiProperty({ type: [RatingLeaderSchema], description: 'Top ro‘yxat (limit gacha).' })
  leaders: RatingLeaderSchema[];
}

export class RatingClassAverageSchema {
  @ApiProperty({ format: 'uuid' }) classId: string;
  @ApiProperty({ example: '1A' }) classLabel: string;
  @ApiProperty({ example: 23 }) avgUmumiyBall: number;
  @ApiProperty({ example: 10 }) studentCount: number;
}

export class RatingSubjectAverageSchema {
  @ApiProperty({ format: 'uuid' }) subjectId: string;
  @ApiProperty({ example: 'Matematika' }) subjectName: string;
  @ApiProperty({ example: 4.2 }) avgBall: number;
  @ApiProperty({ example: 24 }) gradeCount: number;
}

export class RatingSeriesPointSchema {
  @ApiProperty({ example: '2025-09', description: 'YYYY-MM oy kaliti.' }) key: string;
  @ApiProperty({ example: 'Sen', description: 'Qisqa oy yorlig‘i.' }) label: string;
  @ApiProperty({ example: 4.5, description: 'O‘rtacha qiymat.' }) value: number;
}

export class RatingQuarterGradeSchema {
  @ApiProperty({ example: 1 }) quarterNumber: number;
  @ApiProperty({ example: 'Matematika' }) subjectName: string;
  @ApiPropertyOptional({ example: 5, nullable: true }) grade?: number | null;
}

export class RatingStudentDetailSchema {
  @ApiProperty({ format: 'uuid' }) studentId: string;
  @ApiProperty({ example: 'Qodirova Severa' }) studentName: string;
  @ApiPropertyOptional({ example: 'SQ', nullable: true }) initials?: string | null;
  @ApiPropertyOptional({ example: '1B', nullable: true }) classLabel?: string | null;
  @ApiProperty({ example: 2, description: 'Sinf ichidagi o‘rin.' }) rank: number;
  @ApiProperty({ example: 'A’lo', description: 'Daraja yorlig‘i.' }) level: string;
  @ApiProperty({ example: 25 }) umumiyBall: number;
  @ApiProperty({ example: 0 }) ortachaBall: number;
  @ApiProperty({ example: 100 }) davomat: number;
  @ApiProperty({ enum: ['rising', 'stable', 'falling'], example: 'stable' }) trend: RatingTrend;
  @ApiProperty({ type: [RatingSeriesPointSchema], description: 'Dars baholari (oylik o‘rtacha).' })
  darsBaholariOylik: RatingSeriesPointSchema[];
  @ApiProperty({ type: [RatingQuarterGradeSchema], description: 'Choraklik baholar.' })
  choraklikBaholar: RatingQuarterGradeSchema[];
  @ApiProperty({ type: [RatingSeriesPointSchema], description: 'Progress test natijalari (oylik).' })
  progressTest: RatingSeriesPointSchema[];
}
