import { validateDto } from '../src/common/validation/validate-dto';
import { CreateLessonPeriodDto } from '../src/modules/academic/dto/create-lesson-period.dto';

describe('CreateLessonPeriodDto', () => {
  it('accepts a production-ready lesson period payload', async () => {
    const errors = await validateDto(CreateLessonPeriodDto, {
      lessonNumber: 1,
      startTime: '08:00',
      endTime: '08:45',
    });

    expect(errors).toHaveLength(0);
  });

  it('rejects invalid lesson period fields and unknown properties', async () => {
    const errors = await validateDto(CreateLessonPeriodDto, {
      lessonNumber: 0,
      startTime: '8:00',
      endTime: '08:75',
      extra: 'forbidden',
    });

    const serialized = JSON.stringify(errors);
    expect(serialized).toContain('lessonNumber');
    expect(serialized).toContain('startTime');
    expect(serialized).toContain('endTime');
    expect(serialized).toContain('extra');
  });
});
