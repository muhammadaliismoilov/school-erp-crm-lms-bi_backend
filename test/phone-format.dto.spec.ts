import { validateDto } from '../src/common/validation/validate-dto';
import { CreateCandidateDto } from '../src/modules/hr/dto/candidate.dto';
import { CreateStaffMemberDto } from '../src/modules/hr/dto/hr.dto';
import { CreateTeacherDto } from '../src/modules/hr/dto/teacher.dto';
import { UpsertSchoolDto } from '../src/modules/settings/dto/upsert-school.dto';
import { CreateStudentDto } from '../src/modules/students/dto/create-student.dto';
import { EnrollStudentDto } from '../src/modules/students/dto/enroll-student.dto';

/**
 * Loyihaning butun kirish nuqtalarida telefon maydoni bir xil qat'iy formatga
 * (+998 va 9 ta raqam) ega bo'lishini tekshiradi. `whitelist`+`forbidNonWhitelisted`
 * tufayli boshqa majburiy maydonlar yo'qligidan xatolar chiqadi — bu testda faqat
 * telefon maydoniga tegishli xatolik borligi/yo'qligi tekshiriladi.
 */
const CASES: Array<[string, new () => object, string]> = [
  ['CreateCandidateDto', CreateCandidateDto, 'phone'],
  ['CreateStaffMemberDto', CreateStaffMemberDto, 'phone'],
  ['CreateTeacherDto', CreateTeacherDto, 'phone'],
  ['UpsertSchoolDto', UpsertSchoolDto, 'contactPhone'],
  ['CreateStudentDto', CreateStudentDto, 'personalPhone'],
  ['CreateStudentDto', CreateStudentDto, 'guardianPhone'],
  ['EnrollStudentDto', EnrollStudentDto, 'guardianPhone'],
  ['EnrollStudentDto', EnrollStudentDto, 'personalPhone'],
];

describe('+998 telefon formati — barcha DTO kirish nuqtalari', () => {
  it.each(CASES.map(([name, Dto, field]) => ({ name, Dto, field })))(
    '$name.$field to‘g‘ri +998XXXXXXXXX qiymatini qabul qiladi',
    async ({ Dto, field }) => {
      const errors = await validateDto(Dto, { [field]: '+998901234567' });
      expect(JSON.stringify(errors)).not.toContain(`"property":"${field}"`);
    },
  );

  it.each(CASES.map(([name, Dto, field]) => ({ name, Dto, field })))(
    '$name.$field prefikssiz/qisqa raqamni rad etadi',
    async ({ Dto, field }) => {
      const errors = await validateDto(Dto, { [field]: '901234567' });
      expect(JSON.stringify(errors)).toContain(`"property":"${field}"`);
    },
  );

  it.each(CASES.map(([name, Dto, field]) => ({ name, Dto, field })))(
    '$name.$field boshqa davlat kodini rad etadi',
    async ({ Dto, field }) => {
      const errors = await validateDto(Dto, { [field]: '+1234567890' });
      expect(JSON.stringify(errors)).toContain(`"property":"${field}"`);
    },
  );
});
