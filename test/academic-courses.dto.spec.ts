import { validateDto } from '../src/common/validation/validate-dto';
import { CommonStatus } from '../src/common/enums/common-status.enum';
import { AddCourseStudentsDto } from '../src/modules/academic/dto/add-course-students.dto';
import { CourseQueryDto } from '../src/modules/academic/dto/course-query.dto';
import { CreateCourseDto } from '../src/modules/academic/dto/create-course.dto';
import { UpdateCourseDto } from '../src/modules/academic/dto/update-course.dto';

describe('CreateCourseDto', () => {
  const validPayload = {
    name: 'IT',
    quarterId: '5c617a45-57a4-4864-89c8-96e299173908',
    startDate: '2026-03-26',
    endDate: '2026-06-15',
    roomId: 'f0ff63e5-9fc8-4a9a-83de-9453d328d0d7',
    description: 'Frontend va kompyuter savodxonligi kursi',
    subjectId: '8cf35a94-92b4-4f1a-8a7a-90a78003892d',
    teacherId: '42f35a94-92b4-4f1a-8a7a-90a78003892d',
    plannedLessonCount: 24,
    studentIds: ['77f35a94-92b4-4f1a-8a7a-90a78003892d'],
  };

  it('accepts a production-ready course payload', async () => {
    const errors = await validateDto(CreateCourseDto, validPayload);

    expect(errors).toHaveLength(0);
  });

  it('rejects invalid course fields and unknown properties', async () => {
    const errors = await validateDto(CreateCourseDto, {
      name: '',
      quarterId: 'not-uuid',
      startDate: '26/03/2026',
      endDate: '15/06/2026',
      roomId: 'not-uuid',
      subjectId: 'not-uuid',
      teacherId: 'not-uuid',
      plannedLessonCount: -1,
      studentIds: ['not-uuid'],
      extra: 'forbidden',
    });

    const serialized = JSON.stringify(errors);
    expect(serialized).toContain('name');
    expect(serialized).toContain('quarterId');
    expect(serialized).toContain('startDate');
    expect(serialized).toContain('endDate');
    expect(serialized).toContain('roomId');
    expect(serialized).toContain('subjectId');
    expect(serialized).toContain('teacherId');
    expect(serialized).toContain('plannedLessonCount');
    expect(serialized).toContain('studentIds');
    expect(serialized).toContain('extra');
  });
});

describe('UpdateCourseDto', () => {
  it('accepts partial edit payload', async () => {
    const errors = await validateDto(UpdateCourseDto, {
      name: 'IT Foundation',
      status: CommonStatus.ACTIVE,
    });

    expect(errors).toHaveLength(0);
  });
});

describe('CourseQueryDto', () => {
  it('accepts filters used by courses page', async () => {
    const errors = await validateDto(CourseQueryDto, {
      search: 'IT',
      quarterNumber: 4,
      startDate: '2026-03-26',
      endDate: '2026-06-15',
      page: 1,
      limit: 12,
    });

    expect(errors).toHaveLength(0);
  });
});

describe('AddCourseStudentsDto', () => {
  it('accepts selected students for course enrollment', async () => {
    const errors = await validateDto(AddCourseStudentsDto, {
      studentIds: ['77f35a94-92b4-4f1a-8a7a-90a78003892d'],
    });

    expect(errors).toHaveLength(0);
  });
});
