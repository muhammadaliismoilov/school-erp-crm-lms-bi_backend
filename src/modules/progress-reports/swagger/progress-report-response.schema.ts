import { ApiProperty } from '@nestjs/swagger';

export class ReportSubjectSchema {
  @ApiProperty({ format: 'uuid' }) id: string;
  @ApiProperty({ example: 'Matematika' }) name: string;
  @ApiProperty({ example: '#2563EB' }) color: string;
}

export class ReportQuarterSchema {
  @ApiProperty({ format: 'uuid' }) id: string;
  @ApiProperty({ example: 1 }) quarterNumber: number;
}

export class ReportStudentSchema {
  @ApiProperty({ format: 'uuid' }) id: string;
  @ApiProperty({ example: 'Aliyev Aziz' }) name: string;
}

export class ReportPageMetaSchema {
  @ApiProperty({ example: 1 }) page: number;
  @ApiProperty({ example: 20 }) limit: number;
  @ApiProperty({ example: 10 }) total: number;
  @ApiProperty({ example: 1 }) pageCount: number;
}

// ---- Tab 1: O'rtacha o'zlashtirish ----

export class AverageRowSchema {
  @ApiProperty({ type: ReportStudentSchema }) student: ReportStudentSchema;
  @ApiProperty({ description: 'Fan IDsi → o‘rtacha baho.', example: { 'subject-uuid': 4.5 } })
  grades: Record<string, number | null>;
  @ApiProperty({ example: 3.9, nullable: true }) average: number | null;
}

export class AverageFooterSchema {
  @ApiProperty({ description: 'Fan IDsi → sinf o‘rtachasi.', example: { 'subject-uuid': 4.0 } })
  subjectAverages: Record<string, number | null>;
  @ApiProperty({ example: 3.9, nullable: true }) overall: number | null;
}

export class AverageStatsSchema {
  @ApiProperty({ example: 10 }) jamiOquvchilar: number;
  @ApiProperty({ example: 3.9, nullable: true }) ortachaBaho: number | null;
  @ApiProperty({ example: 0 }) alochilar: number;
  @ApiProperty({ example: 0 }) alochilarPercent: number;
  @ApiProperty({ example: 10 }) yaxshi: number;
  @ApiProperty({ example: 100 }) yaxshiPercent: number;
  @ApiProperty({ example: 0 }) qoniqarsiz: number;
  @ApiProperty({ example: 0 }) qoniqarsizPercent: number;
}

export class AverageReportSchema {
  @ApiProperty({ type: [ReportSubjectSchema] }) subjects: ReportSubjectSchema[];
  @ApiProperty({ type: [AverageRowSchema] }) rows: AverageRowSchema[];
  @ApiProperty({ type: AverageFooterSchema }) footer: AverageFooterSchema;
  @ApiProperty({ type: AverageStatsSchema }) stats: AverageStatsSchema;
  @ApiProperty({ type: ReportPageMetaSchema }) meta: ReportPageMetaSchema;
}

// ---- Tab 2: Choraklik ----

export class QuarterlyRowSchema {
  @ApiProperty({ type: ReportStudentSchema }) student: ReportStudentSchema;
  @ApiProperty({ description: 'subjectId → quarterId → baho.', example: { 'subject-uuid': { 'quarter-uuid': 5 } } })
  cells: Record<string, Record<string, number | null>>;
  @ApiProperty({ example: 3.9, nullable: true }) average: number | null;
}

export class QuarterlyReportSchema {
  @ApiProperty({ type: [ReportSubjectSchema] }) subjects: ReportSubjectSchema[];
  @ApiProperty({ type: [ReportQuarterSchema] }) quarters: ReportQuarterSchema[];
  @ApiProperty({ type: [QuarterlyRowSchema] }) rows: QuarterlyRowSchema[];
  @ApiProperty({ type: ReportPageMetaSchema }) meta: ReportPageMetaSchema;
}

// ---- Tab 3: Progress imtihon ----

export class ProgressExamRowSchema {
  @ApiProperty({ type: ReportStudentSchema }) student: ReportStudentSchema;
  @ApiProperty({ example: 4.2, nullable: true }) avgBaho: number | null;
  @ApiProperty({ example: 84, nullable: true }) avgBall: number | null;
}

export class ProgressExamStatsSchema {
  @ApiProperty({ example: 10 }) jamiOquvchilar: number;
  @ApiProperty({ example: 4.2, nullable: true }) sinfOrtachaBaho: number | null;
  @ApiProperty({ example: 84, nullable: true }) sinfOrtachaBall: number | null;
}

export class ProgressExamReportSchema {
  @ApiProperty({ type: [ProgressExamRowSchema] }) rows: ProgressExamRowSchema[];
  @ApiProperty({ type: ProgressExamStatsSchema }) stats: ProgressExamStatsSchema;
  @ApiProperty({ type: ReportPageMetaSchema }) meta: ReportPageMetaSchema;
}
