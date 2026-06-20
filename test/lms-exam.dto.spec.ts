import { validateDto } from '../src/common/validation/validate-dto';
import {
  CreateClassExamDto,
  CreateCourseExamDto,
  ExamQueryDto,
  UpdateExamDto,
} from '../src/modules/lms/dto/exam.dto';
import { ExamStatus, ExamType } from '../src/modules/lms/enums/lms.enums';

const UUID = '8cf35a94-92b4-4f1a-8a7a-90a78003892d';

describe('CreateClassExamDto', () => {
  it('to‘g‘ri sinf imtihoni payloadini qabul qiladi', async () => {
    const errors = await validateDto(CreateClassExamDto, {
      classId: UUID,
      subjectId: UUID,
      teacherId: UUID,
      quarterId: UUID,
      examType: ExamType.TEST,
      examDate: '2026-06-23',
      availableFrom: '2026-06-23T11:00:00.000Z',
      availableUntil: '2026-06-23T12:25:00.000Z',
      maxScore: 100,
    });
    expect(errors).toHaveLength(0);
  });

  it('majburiy maydonlar yo‘qolsa va sana noto‘g‘ri bo‘lsa rad etadi', async () => {
    const errors = await validateDto(CreateClassExamDto, {
      classId: 'not-a-uuid',
      examType: 'invalid',
      examDate: '23/06/2026',
      extra: 'forbidden',
    });
    const serialized = JSON.stringify(errors);
    expect(serialized).toContain('classId');
    expect(serialized).toContain('subjectId');
    expect(serialized).toContain('teacherId');
    expect(serialized).toContain('examType');
    expect(serialized).toContain('examDate');
    expect(serialized).toContain('extra');
  });
});

describe('CreateCourseExamDto', () => {
  it('to‘g‘ri kurs imtihoni payloadini qabul qiladi', async () => {
    const errors = await validateDto(CreateCourseExamDto, {
      courseId: UUID,
      quarterId: UUID,
      examType: ExamType.DICTATION,
      examDate: '2026-06-18',
    });
    expect(errors).toHaveLength(0);
  });

  it('courseId uuid bo‘lmasa rad etadi', async () => {
    const errors = await validateDto(CreateCourseExamDto, {
      courseId: 'x',
      quarterId: UUID,
      examType: ExamType.TEST,
      examDate: '2026-06-18',
    });
    expect(JSON.stringify(errors)).toContain('courseId');
  });
});

describe('UpdateExamDto', () => {
  it('qisman payloadni qabul qiladi', async () => {
    const errors = await validateDto(UpdateExamDto, { status: ExamStatus.FINISHED, maxScore: 50 });
    expect(errors).toHaveLength(0);
  });
});

describe('ExamQueryDto', () => {
  it('filtrlarni qabul qiladi va number larni cast qiladi', async () => {
    const errors = await validateDto(ExamQueryDto, {
      kind: 'class',
      quarterNumber: '2',
      status: 'draft',
      examType: 'test',
      page: '1',
      limit: '30',
      dateFrom: '2026-06-01',
      dateTo: '2026-06-30',
    });
    expect(errors).toHaveLength(0);
  });

  it('chegaradan tashqari quarterNumber ni rad etadi', async () => {
    const errors = await validateDto(ExamQueryDto, { quarterNumber: '9' });
    expect(JSON.stringify(errors)).toContain('quarterNumber');
  });
});
