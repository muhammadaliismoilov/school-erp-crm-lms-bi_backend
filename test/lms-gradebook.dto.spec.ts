import { validateDto } from '../src/common/validation/validate-dto';
import {
  AwardJournalCoinDto,
  GenerateJournalLessonsDto,
  QuarterGradeDto,
  UpsertGradeDto,
} from '../src/modules/lms/dto/gradebook.dto';

const UUID = '8cf35a94-92b4-4f1a-8a7a-90a78003892d';

describe('UpsertGradeDto', () => {
  it('ball + davomat bilan to‘g‘ri payload', async () => {
    const errors = await validateDto(UpsertGradeDto, {
      lessonId: UUID,
      studentId: UUID,
      grade: 5,
      ball: 90,
      attendance: 'present',
    });
    expect(errors).toHaveLength(0);
  });

  it('noto‘g‘ri ball va davomatni rad etadi', async () => {
    const errors = await validateDto(UpsertGradeDto, {
      lessonId: UUID,
      studentId: UUID,
      ball: 150,
      attendance: 'wrong',
    });
    const s = JSON.stringify(errors);
    expect(s).toContain('ball');
    expect(s).toContain('attendance');
  });
});

describe('QuarterGradeDto', () => {
  it('to‘g‘ri choraklik baho', async () => {
    const errors = await validateDto(QuarterGradeDto, { studentId: UUID, subjectId: UUID, quarterId: UUID, grade: 4, ball: 80 });
    expect(errors).toHaveLength(0);
  });
  it('baho chegarasini tekshiradi', async () => {
    const errors = await validateDto(QuarterGradeDto, { studentId: UUID, subjectId: UUID, quarterId: UUID, grade: 9 });
    expect(JSON.stringify(errors)).toContain('grade');
  });
});

describe('GenerateJournalLessonsDto', () => {
  it('uchala uuid talab qilinadi', async () => {
    const errors = await validateDto(GenerateJournalLessonsDto, { classId: 'x', subjectId: UUID, quarterId: UUID });
    expect(JSON.stringify(errors)).toContain('classId');
  });
});

describe('AwardJournalCoinDto', () => {
  it('to‘g‘ri tanga payload', async () => {
    const errors = await validateDto(AwardJournalCoinDto, { studentId: UUID, type: 'earn', amount: 1000, reason: 'Mehnat', lessonId: UUID });
    expect(errors).toHaveLength(0);
  });
  it('noto‘g‘ri type va amountni rad etadi', async () => {
    const errors = await validateDto(AwardJournalCoinDto, { studentId: UUID, type: 'bad', amount: 0, reason: '' });
    const s = JSON.stringify(errors);
    expect(s).toContain('type');
    expect(s).toContain('amount');
  });
});
