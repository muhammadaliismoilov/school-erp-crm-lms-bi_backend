import { validateDto } from '../src/common/validation/validate-dto';
import {
  CreateScheduleCellDto,
  GenerateScheduleDto,
  SubstituteTeacherDto,
} from '../src/modules/lms/dto/schedule.dto';

const UUID = '8cf35a94-92b4-4f1a-8a7a-90a78003892d';

describe('CreateScheduleCellDto', () => {
  it('to‘g‘ri katak payloadini qabul qiladi', async () => {
    const errors = await validateDto(CreateScheduleCellDto, {
      quarterId: UUID,
      classId: UUID,
      lessonPeriodId: UUID,
      weekday: 1,
      subjectId: UUID,
      fromToday: true,
    });
    expect(errors).toHaveLength(0);
  });

  it('noto‘g‘ri weekday va uuid larni rad etadi', async () => {
    const errors = await validateDto(CreateScheduleCellDto, {
      quarterId: 'not-a-uuid',
      classId: UUID,
      lessonPeriodId: UUID,
      weekday: 9,
      extra: 'forbidden',
    });
    const serialized = JSON.stringify(errors);
    expect(serialized).toContain('quarterId');
    expect(serialized).toContain('weekday');
    expect(serialized).toContain('extra');
  });
});

describe('GenerateScheduleDto', () => {
  it('to‘g‘ri avtogeneratsiya payloadini qabul qiladi', async () => {
    const errors = await validateDto(GenerateScheduleDto, {
      quarterId: UUID,
      mode: 'add',
      days: [1, 2, 3, 4, 5],
      maxPerDay: 7,
      maxPerSubjectPerDay: 2,
      distribution: [{ classId: UUID, subjectId: UUID, teacherId: UUID, hoursPerWeek: 3 }],
    });
    expect(errors).toHaveLength(0);
  });

  it('bo‘sh distribution va noto‘g‘ri rejimni rad etadi', async () => {
    const errors = await validateDto(GenerateScheduleDto, {
      quarterId: UUID,
      mode: 'wrong',
      days: [],
      maxPerDay: 0,
      maxPerSubjectPerDay: 99,
      distribution: [],
    });
    const serialized = JSON.stringify(errors);
    expect(serialized).toContain('mode');
    expect(serialized).toContain('days');
    expect(serialized).toContain('distribution');
  });
});

describe('SubstituteTeacherDto', () => {
  it('count chegaralarini tekshiradi', async () => {
    const errors = await validateDto(SubstituteTeacherDto, {
      quarterId: UUID,
      classId: UUID,
      subjectId: UUID,
      lessonPeriodId: UUID,
      weekday: 1,
      substituteTeacherId: UUID,
      count: 0,
    });
    expect(JSON.stringify(errors)).toContain('count');
  });
});
