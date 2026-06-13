import { ApiProperty } from '@nestjs/swagger';
import { ArrayMaxSize, ArrayMinSize, ArrayUnique, IsArray, IsUUID } from 'class-validator';

export class AddCourseStudentsDto {
  @ApiProperty({
    description: 'Kursga biriktiriladigan o‘quvchilar IDlari.',
    example: ['77f35a94-92b4-4f1a-8a7a-90a78003892d'],
    type: [String],
    format: 'uuid',
    minItems: 1,
    maxItems: 200,
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(200)
  @ArrayUnique()
  @IsUUID('4', { each: true })
  studentIds: string[];
}

export class CourseStudentParamDto {
  @ApiProperty({ example: '6c617a45-57a4-4864-89c8-96e299173908', format: 'uuid' })
  @IsUUID()
  id: string;

  @ApiProperty({ example: '77f35a94-92b4-4f1a-8a7a-90a78003892d', format: 'uuid' })
  @IsUUID()
  studentId: string;
}
