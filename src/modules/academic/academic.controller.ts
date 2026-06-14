import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import type { Request } from "express";
import {
  ApiBearerAuth,
  ApiBody,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from "@nestjs/swagger";
import { AppPermission } from "../../common/constants/permissions";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Permissions } from "../../common/decorators/permissions.decorator";
import { UuidParamDto } from "../../common/dto/uuid-param.dto";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { PermissionsGuard } from "../../common/guards/permissions.guard";
import type { AuthenticatedUser } from "../../common/security/authenticated-user.interface";
import { ApiLocalizedErrorResponses } from "../../common/swagger/api-localized-error-responses.decorator";
import { AcademicActor, AcademicService } from "./academic.service";
import { ClassQueryDto } from "./dto/class-query.dto";
import {
  ClassDetailResponseEnvelopeDto,
  ClassListResponseEnvelopeDto,
  ClassResponseEnvelopeDto,
  SendClassSmsResponseEnvelopeDto,
  TransferClassStudentsResponseEnvelopeDto,
} from "./dto/class-response.dto";
import {
  AddCourseStudentsDto,
  CourseStudentParamDto,
} from "./dto/add-course-students.dto";
import {
  AvailableCourseStudentsQueryDto,
  CourseQueryDto,
} from "./dto/course-query.dto";
import {
  CourseDetailResponseEnvelopeDto,
  CourseListResponseEnvelopeDto,
  CourseResponseEnvelopeDto,
  CourseStudentListResponseEnvelopeDto,
} from "./dto/course-response.dto";
import { CreateAcademicYearDto } from "./dto/create-academic-year.dto";
import { CreateClassDto } from "./dto/create-class.dto";
import { CreateCourseDto } from "./dto/create-course.dto";
import { CreateLessonPeriodDto } from "./dto/create-lesson-period.dto";
import { CreateQuarterDto } from "./dto/create-quarter.dto";
import { CreateSubjectDto } from "./dto/create-subject.dto";
import { SubjectQueryDto } from "./dto/subject-query.dto";
import {
  SubjectListResponseEnvelopeDto,
  SubjectResponseEnvelopeDto,
} from "./dto/subject-response.dto";
import {
  LessonPeriodListResponseEnvelopeDto,
  LessonPeriodResponseEnvelopeDto,
} from "./dto/lesson-period-response.dto";
import { QuarterQueryDto } from "./dto/quarter-query.dto";
import { SendClassSmsDto } from "./dto/send-class-sms.dto";
import { TransferClassStudentsDto } from "./dto/transfer-class-students.dto";
import { UpdateAcademicYearDto } from "./dto/update-academic-year.dto";
import { UpdateClassDto } from "./dto/update-class.dto";
import { UpdateCourseDto } from "./dto/update-course.dto";
import { UpdateLessonPeriodDto } from "./dto/update-lesson-period.dto";
import { UpdateSubjectDto } from "./dto/update-subject.dto";
import { UpdateQuarterDto } from "./dto/update-quarter.dto";

const uuidParamDocs = {
  name: "id",
  description: "Resurs IDsi UUID formatida.",
  example: "f0ff63e5-9fc8-4a9a-83de-9453d328d0d7",
};

@ApiTags("Taʼlim")
@ApiBearerAuth()
@ApiLocalizedErrorResponses({ notFound: true, conflict: true })
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller({ path: "academic", version: "1" })
export class AcademicController {
  constructor(private readonly academicService: AcademicService) {}

  @Get("years")
  @Permissions([AppPermission.ACADEMIC_READ])
  @ApiOperation({ summary: "O‘quv yillar ro‘yxatini olish" })
  @ApiOkResponse({ description: "O‘quv yillar qaytarildi." })
  findYears() {
    return this.academicService.listAcademicYears();
  }

  @Post("years")
  @Permissions([AppPermission.ACADEMIC_MANAGE])
  @ApiOperation({ summary: "O‘quv yili yaratish" })
  @ApiCreatedResponse({ description: "O‘quv yili yaratildi." })
  createYear(@Body() dto: CreateAcademicYearDto, @CurrentUser() user: AuthenticatedUser, @Req() request: Request) {
    return this.academicService.createAcademicYear(dto, this.buildActor(user, request));
  }

  @Get("years/:id")
  @Permissions([AppPermission.ACADEMIC_READ])
  @ApiOperation({ summary: "O‘quv yilini ID bo‘yicha olish" })
  @ApiParam(uuidParamDocs)
  @ApiOkResponse({ description: "O‘quv yili qaytarildi." })
  findYear(@Param() params: UuidParamDto) {
    return this.academicService.findAcademicYear(params.id);
  }

  @Patch("years/:id")
  @Permissions([AppPermission.ACADEMIC_MANAGE])
  @ApiOperation({ summary: "O‘quv yilini tahrirlash" })
  @ApiParam(uuidParamDocs)
  @ApiOkResponse({ description: "O‘quv yili tahrirlandi." })
  updateYear(
    @Param() params: UuidParamDto,
    @Body() dto: UpdateAcademicYearDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
  ) {
    return this.academicService.updateAcademicYear(params.id, dto, this.buildActor(user, request));
  }

  @Post("years/:id/set-current")
  @HttpCode(HttpStatus.OK)
  @Permissions([AppPermission.ACADEMIC_MANAGE])
  @ApiOperation({ summary: "O‘quv yilini joriy qilish" })
  @ApiParam(uuidParamDocs)
  @ApiOkResponse({ description: "O‘quv yili joriy qilindi; qolganlari joriylikdan chiqarildi." })
  setCurrentYear(
    @Param() params: UuidParamDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
  ) {
    return this.academicService.setCurrentAcademicYear(params.id, this.buildActor(user, request));
  }

  @Delete("years/:id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @Permissions([AppPermission.ACADEMIC_MANAGE])
  @ApiOperation({ summary: "O‘quv yilini arxivlash" })
  @ApiParam(uuidParamDocs)
  @ApiNoContentResponse({
    description: "O‘quv yili arxivlandi. Body qaytmaydi.",
  })
  deleteYear(@Param() params: UuidParamDto, @CurrentUser() user: AuthenticatedUser, @Req() request: Request) {
    return this.academicService.deleteAcademicYear(params.id, this.buildActor(user, request));
  }

  private buildActor(user: AuthenticatedUser, request: Request): AcademicActor {
    return { userId: user?.id, ipAddress: request?.ip };
  }

  @Get("quarters")
  @Permissions([AppPermission.ACADEMIC_READ])
  @ApiOperation({ summary: "Choraklar ro‘yxatini olish" })
  @ApiOkResponse({ description: "Choraklar qaytarildi." })
  findQuarters(@Query() query: QuarterQueryDto) {
    return this.academicService.listQuarters(query);
  }

  @Post("quarters")
  @Permissions([AppPermission.ACADEMIC_MANAGE])
  @ApiOperation({ summary: "Chorak yaratish" })
  @ApiCreatedResponse({ description: "Chorak yaratildi." })
  createQuarter(@Body() dto: CreateQuarterDto, @CurrentUser() user: AuthenticatedUser, @Req() request: Request) {
    return this.academicService.createQuarter(dto, this.buildActor(user, request));
  }

  @Get("quarters/:id")
  @Permissions([AppPermission.ACADEMIC_READ])
  @ApiOperation({ summary: "Chorakni ID bo‘yicha olish" })
  @ApiParam(uuidParamDocs)
  @ApiOkResponse({ description: "Chorak qaytarildi." })
  findQuarter(@Param() params: UuidParamDto) {
    return this.academicService.findQuarter(params.id);
  }

  @Patch("quarters/:id")
  @Permissions([AppPermission.ACADEMIC_MANAGE])
  @ApiOperation({ summary: "Chorakni tahrirlash" })
  @ApiParam(uuidParamDocs)
  @ApiOkResponse({ description: "Chorak tahrirlandi." })
  updateQuarter(
    @Param() params: UuidParamDto,
    @Body() dto: UpdateQuarterDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
  ) {
    return this.academicService.updateQuarter(params.id, dto, this.buildActor(user, request));
  }

  @Delete("quarters/:id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @Permissions([AppPermission.ACADEMIC_MANAGE])
  @ApiOperation({ summary: "Chorakni arxivlash" })
  @ApiParam(uuidParamDocs)
  @ApiNoContentResponse({ description: "Chorak arxivlandi. Body qaytmaydi." })
  deleteQuarter(@Param() params: UuidParamDto, @CurrentUser() user: AuthenticatedUser, @Req() request: Request) {
    return this.academicService.deleteQuarter(params.id, this.buildActor(user, request));
  }

  @Get("lesson-periods")
  @Permissions([AppPermission.ACADEMIC_READ])
  @ApiOperation({
    summary: "Dars vaqtlarini olish",
    description:
      "Darslar tartib raqami bo‘yicha saralanadi va vaqtlar HH:mm formatida qaytariladi.",
  })
  @ApiOkResponse({
    description: "Dars vaqtlari envelope ichida qaytarildi.",
    type: LessonPeriodListResponseEnvelopeDto,
  })
  findLessonPeriods() {
    return this.academicService.listLessonPeriods();
  }

  @Post("lesson-periods")
  @Permissions([AppPermission.ACADEMIC_MANAGE])
  @ApiOperation({
    summary: "Dars vaqti yaratish",
    description:
      "Backend lessonNumber bo‘yicha 1-Dars kabi kod yaratadi, vaqtni tekshiradi, duplicate va overlap holatlarni rad etadi.",
  })
  @ApiBody({
    type: CreateLessonPeriodDto,
    examples: {
      firstLesson: {
        summary: "Birinchi dars",
        value: { lessonNumber: 1, startTime: "08:00", endTime: "08:45" },
      },
    },
  })
  @ApiCreatedResponse({
    description: "Dars vaqti envelope ichida yaratildi.",
    type: LessonPeriodResponseEnvelopeDto,
  })
  createLessonPeriod(
    @Body() dto: CreateLessonPeriodDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
  ) {
    return this.academicService.createLessonPeriod(dto, this.buildActor(user, request));
  }

  @Get("lesson-periods/:id")
  @Permissions([AppPermission.ACADEMIC_READ])
  @ApiOperation({ summary: "Dars vaqtini ID bo‘yicha olish" })
  @ApiParam(uuidParamDocs)
  @ApiOkResponse({
    description: "Dars vaqti envelope ichida qaytarildi.",
    type: LessonPeriodResponseEnvelopeDto,
  })
  findLessonPeriod(@Param() params: UuidParamDto) {
    return this.academicService.findLessonPeriod(params.id);
  }

  @Patch("lesson-periods/:id")
  @Permissions([AppPermission.ACADEMIC_MANAGE])
  @ApiOperation({ summary: "Dars vaqtini tahrirlash" })
  @ApiParam(uuidParamDocs)
  @ApiBody({ type: UpdateLessonPeriodDto })
  @ApiOkResponse({
    description: "Dars vaqti tahrirlandi.",
    type: LessonPeriodResponseEnvelopeDto,
  })
  updateLessonPeriod(
    @Param() params: UuidParamDto,
    @Body() dto: UpdateLessonPeriodDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
  ) {
    return this.academicService.updateLessonPeriod(params.id, dto, this.buildActor(user, request));
  }

  @Delete("lesson-periods/:id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @Permissions([AppPermission.ACADEMIC_MANAGE])
  @ApiOperation({ summary: "Dars vaqtini arxivlash" })
  @ApiParam(uuidParamDocs)
  @ApiNoContentResponse({
    description: "Dars vaqti arxivlandi. Body qaytmaydi.",
  })
  deleteLessonPeriod(
    @Param() params: UuidParamDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
  ) {
    return this.academicService.deleteLessonPeriod(params.id, this.buildActor(user, request));
  }

  @Get("subjects")
  @Permissions([AppPermission.ACADEMIC_READ])
  @ApiOperation({
    summary: "Fanlar ro‘yxatini olish",
    description:
      "Fanlar nomi bo‘yicha saralanadi. search va status querylari orqali settings sahifasidagi qidiruv/filter ishlaydi.",
  })
  @ApiOkResponse({
    description: "Fanlar envelope ichida qaytarildi.",
    type: SubjectListResponseEnvelopeDto,
  })
  findSubjects(@Query() query: SubjectQueryDto) {
    return this.academicService.findSubjects(query);
  }

  @Post("subjects")
  @Permissions([AppPermission.ACADEMIC_MANAGE])
  @ApiOperation({
    summary: "Fan yaratish",
    description:
      "Nomi, ruscha nomi va HEX rang majburiy. Kod berilmasa backend nomdan avtomatik kod yaratadi.",
  })
  @ApiBody({
    type: CreateSubjectDto,
    examples: {
      mathematics: {
        summary: "Matematika fanini yaratish",
        value: {
          name: "Matematika",
          russianName: "Matematika",
          color: "#2563EB",
        },
      },
    },
  })
  @ApiCreatedResponse({
    description: "Fan envelope ichida yaratildi.",
    type: SubjectResponseEnvelopeDto,
  })
  createSubject(@Body() dto: CreateSubjectDto) {
    return this.academicService.createSubject(dto);
  }

  @Get("subjects/:id")
  @Permissions([AppPermission.ACADEMIC_READ])
  @ApiOperation({ summary: "Fanni ID bo‘yicha olish" })
  @ApiParam(uuidParamDocs)
  @ApiOkResponse({
    description: "Fan envelope ichida qaytarildi.",
    type: SubjectResponseEnvelopeDto,
  })
  findSubject(@Param() params: UuidParamDto) {
    return this.academicService.findSubject(params.id);
  }

  @Patch("subjects/:id")
  @Permissions([AppPermission.ACADEMIC_MANAGE])
  @ApiOperation({
    summary: "Fanni tahrirlash",
    description:
      "Nomi, ruscha nomi, rangi, kodi yoki faol/nofoal holatini qisman yangilaydi.",
  })
  @ApiParam(uuidParamDocs)
  @ApiBody({
    type: UpdateSubjectDto,
    examples: {
      editSubject: {
        summary: "Fanni tahrirlash",
        value: {
          name: "Ingliz tili",
          russianName: "Angliyskiy yazik",
          color: "#16A34A",
          isActive: true,
        },
      },
    },
  })
  @ApiOkResponse({
    description: "Fan tahrirlandi.",
    type: SubjectResponseEnvelopeDto,
  })
  updateSubject(@Param() params: UuidParamDto, @Body() dto: UpdateSubjectDto) {
    return this.academicService.updateSubject(params.id, dto);
  }

  @Delete("subjects/:id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @Permissions([AppPermission.ACADEMIC_MANAGE])
  @ApiOperation({ summary: "Fanni arxivlash" })
  @ApiParam(uuidParamDocs)
  @ApiNoContentResponse({ description: "Fan arxivlandi. Body qaytmaydi." })
  deleteSubject(@Param() params: UuidParamDto) {
    return this.academicService.deleteSubject(params.id);
  }

  @Get("courses")
  @Permissions([AppPermission.ACADEMIC_READ])
  @ApiOperation({
    summary: "Kurslar ro‘yxatini olish",
    description:
      "Kurslar sahifasi uchun qidiruv, chorak, sana, fan, o‘qituvchi va status filterlari hamda pagination bilan qaytaradi.",
  })
  @ApiOkResponse({
    description: "Kurslar pagination bilan envelope ichida qaytarildi.",
    type: CourseListResponseEnvelopeDto,
  })
  findCourses(@Query() query: CourseQueryDto) {
    return this.academicService.findCourses(query);
  }

  @Post("courses")
  @Permissions([AppPermission.ACADEMIC_MANAGE])
  @ApiOperation({
    summary: "Kurs yaratish",
    description:
      "Kurs nomi, chorak, sana oralig‘i, xona, fan va o‘qituvchi majburiy. Sana chorak oralig‘idan chiqmasligi kerak.",
  })
  @ApiBody({
    type: CreateCourseDto,
    examples: {
      itCourse: {
        summary: "IT kursini yaratish",
        value: {
          name: "IT",
          quarterId: "5c617a45-57a4-4864-89c8-96e299173908",
          startDate: "2026-03-26",
          endDate: "2026-06-15",
          roomId: "f0ff63e5-9fc8-4a9a-83de-9453d328d0d7",
          description: "Frontend kursi",
          subjectId: "8cf35a94-92b4-4f1a-8a7a-90a78003892d",
          teacherId: "42f35a94-92b4-4f1a-8a7a-90a78003892d",
          plannedLessonCount: 24,
        },
      },
    },
  })
  @ApiCreatedResponse({
    description: "Kurs envelope ichida yaratildi.",
    type: CourseResponseEnvelopeDto,
  })
  createCourse(@Body() dto: CreateCourseDto) {
    return this.academicService.createCourse(dto);
  }

  @Get("courses/:id/available-students")
  @Permissions([AppPermission.ACADEMIC_READ])
  @ApiOperation({
    summary: "Kursga qo‘shish mumkin bo‘lgan o‘quvchilarni qidirish",
    description:
      "Sinf va qidiruv bo‘yicha filterlaydi, kursga allaqachon biriktirilgan o‘quvchilarni chiqarib tashlaydi.",
  })
  @ApiParam(uuidParamDocs)
  @ApiOkResponse({
    description: "O‘quvchilar ro‘yxati envelope ichida qaytarildi.",
    type: CourseStudentListResponseEnvelopeDto,
  })
  findAvailableCourseStudents(
    @Param() params: UuidParamDto,
    @Query() query: AvailableCourseStudentsQueryDto,
  ) {
    return this.academicService.findAvailableCourseStudents(params.id, query);
  }

  @Post("courses/:id/students")
  @Permissions([AppPermission.ACADEMIC_MANAGE])
  @ApiOperation({ summary: "Kursga o‘quvchilar qo‘shish" })
  @ApiParam(uuidParamDocs)
  @ApiBody({
    type: AddCourseStudentsDto,
    examples: {
      selectedStudents: {
        summary: "Tanlangan o‘quvchilarni qo‘shish",
        value: { studentIds: ["77f35a94-92b4-4f1a-8a7a-90a78003892d"] },
      },
    },
  })
  @ApiOkResponse({
    description: "Kurs detail envelope ichida qaytarildi.",
    type: CourseDetailResponseEnvelopeDto,
  })
  addCourseStudents(
    @Param() params: UuidParamDto,
    @Body() dto: AddCourseStudentsDto,
  ) {
    return this.academicService.addCourseStudents(params.id, dto);
  }

  @Delete("courses/:id/students/:studentId")
  @Permissions([AppPermission.ACADEMIC_MANAGE])
  @ApiOperation({ summary: "Kursdan bitta o‘quvchini olib tashlash" })
  @ApiParam(uuidParamDocs)
  @ApiParam({
    name: "studentId",
    description: "Kursdan olib tashlanadigan o‘quvchi IDsi.",
    example: "77f35a94-92b4-4f1a-8a7a-90a78003892d",
  })
  @ApiOkResponse({
    description: "Yangilangan kurs detail envelope ichida qaytarildi.",
    type: CourseDetailResponseEnvelopeDto,
  })
  removeCourseStudent(@Param() params: CourseStudentParamDto) {
    return this.academicService.removeCourseStudent(
      params.id,
      params.studentId,
    );
  }

  @Get("courses/:id")
  @Permissions([AppPermission.ACADEMIC_READ])
  @ApiOperation({
    summary: "Kurs haqida maʼlumot olish",
    description:
      "Kurs maʼlumotlari, fan, o‘qituvchi, xona, chorak, statistikalar va tanlangan o‘quvchilarni qaytaradi.",
  })
  @ApiParam(uuidParamDocs)
  @ApiOkResponse({
    description: "Kurs detail envelope ichida qaytarildi.",
    type: CourseDetailResponseEnvelopeDto,
  })
  findCourse(@Param() params: UuidParamDto) {
    return this.academicService.findCourse(params.id);
  }

  @Patch("courses/:id")
  @Permissions([AppPermission.ACADEMIC_MANAGE])
  @ApiOperation({ summary: "Kursni tahrirlash" })
  @ApiParam(uuidParamDocs)
  @ApiBody({ type: UpdateCourseDto })
  @ApiOkResponse({
    description: "Kurs tahrirlandi.",
    type: CourseResponseEnvelopeDto,
  })
  updateCourse(@Param() params: UuidParamDto, @Body() dto: UpdateCourseDto) {
    return this.academicService.updateCourse(params.id, dto);
  }

  @Delete("courses/:id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @Permissions([AppPermission.ACADEMIC_MANAGE])
  @ApiOperation({ summary: "Kursni arxivlash" })
  @ApiParam(uuidParamDocs)
  @ApiNoContentResponse({ description: "Kurs arxivlandi. Body qaytmaydi." })
  deleteCourse(@Param() params: UuidParamDto) {
    return this.academicService.deleteCourse(params.id);
  }

  @Get("classes")
  @Permissions([AppPermission.ACADEMIC_READ])
  @ApiOperation({
    summary: "Sinflar ro‘yxatini olish",
    description:
      "Sinflar daraja va harf bo‘yicha saralanadi. Query orqali o‘quv yili, daraja, til, xona, kurator va qidiruv filtrlanadi.",
  })
  @ApiOkResponse({
    description: "Sinflar envelope ichida qaytarildi.",
    type: ClassListResponseEnvelopeDto,
  })
  findClasses(@Query() query: ClassQueryDto) {
    return this.academicService.findClasses(query);
  }

  @Post("classes")
  @Permissions([AppPermission.ACADEMIC_MANAGE])
  @ApiOperation({
    summary: "Sinf yaratish",
    description:
      "Daraja va sinf harfidan 1-A kabi nom yaratiladi. O‘quv yili ichida bir xil daraja+harf takrorlanmaydi.",
  })
  @ApiBody({
    type: CreateClassDto,
    examples: {
      firstA: {
        summary: "1-A sinf yaratish",
        value: {
          gradeLevel: 1,
          section: "A",
          language: "uz",
          roomId: "f0ff63e5-9fc8-4a9a-83de-9453d328d0d7",
          curatorId: "8cf35a94-92b4-4f1a-8a7a-90a78003892d",
          academicYearId: "5c617a45-57a4-4864-89c8-96e299173908",
          capacity: 30,
        },
      },
    },
  })
  @ApiCreatedResponse({
    description: "Sinf envelope ichida yaratildi.",
    type: ClassResponseEnvelopeDto,
  })
  createClass(
    @Body() dto: CreateClassDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
  ) {
    return this.academicService.createClass(dto, this.buildActor(user, request));
  }

  @Get("classes/:id")
  @Permissions([AppPermission.ACADEMIC_READ])
  @ApiOperation({
    summary: "Sinfni ko‘rish",
    description:
      "Sinf maʼlumotlari, xona, kurator, statistikalar va o‘quvchilar ro‘yxatini qaytaradi.",
  })
  @ApiParam(uuidParamDocs)
  @ApiOkResponse({
    description: "Sinf detail envelope ichida qaytarildi.",
    type: ClassDetailResponseEnvelopeDto,
  })
  findClass(@Param() params: UuidParamDto) {
    return this.academicService.findClass(params.id);
  }

  @Patch("classes/:id")
  @Permissions([AppPermission.ACADEMIC_MANAGE])
  @ApiOperation({ summary: "Sinfni tahrirlash" })
  @ApiParam(uuidParamDocs)
  @ApiBody({ type: UpdateClassDto })
  @ApiOkResponse({
    description: "Sinf tahrirlandi.",
    type: ClassResponseEnvelopeDto,
  })
  updateClass(
    @Param() params: UuidParamDto,
    @Body() dto: UpdateClassDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
  ) {
    return this.academicService.updateClass(params.id, dto, this.buildActor(user, request));
  }

  @Delete("classes/:id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @Permissions([AppPermission.ACADEMIC_MANAGE])
  @ApiOperation({ summary: "Sinfni arxivlash" })
  @ApiParam(uuidParamDocs)
  @ApiNoContentResponse({ description: "Sinf arxivlandi. Body qaytmaydi." })
  deleteClass(
    @Param() params: UuidParamDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
  ) {
    return this.academicService.deleteClass(params.id, this.buildActor(user, request));
  }

  @Post("classes/:id/transfer-students")
  @Permissions([AppPermission.ACADEMIC_MANAGE])
  @ApiOperation({
    summary: "O‘quvchilarni boshqa sinfga ko‘chirish",
    description:
      "studentIds berilsa faqat tanlanganlar, berilmasa manba sinfdagi barcha o‘quvchilar maqsad sinfga ko‘chiriladi.",
  })
  @ApiParam(uuidParamDocs)
  @ApiBody({
    type: TransferClassStudentsDto,
    examples: {
      allStudents: {
        summary: "Barcha o‘quvchilarni ko‘chirish",
        value: {
          academicYearId: "5c617a45-57a4-4864-89c8-96e299173908",
          targetClassId: "8cf35a94-92b4-4f1a-8a7a-90a78003892d",
        },
      },
      selectedStudents: {
        summary: "Tanlangan o‘quvchilarni ko‘chirish",
        value: {
          academicYearId: "5c617a45-57a4-4864-89c8-96e299173908",
          targetClassId: "8cf35a94-92b4-4f1a-8a7a-90a78003892d",
          studentIds: ["2c617a45-57a4-4864-89c8-96e299173908"],
        },
      },
    },
  })
  @ApiOkResponse({
    description: "Ko‘chirish natijasi envelope ichida qaytarildi.",
    type: TransferClassStudentsResponseEnvelopeDto,
  })
  transferClassStudents(
    @Param() params: UuidParamDto,
    @Body() dto: TransferClassStudentsDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
  ) {
    return this.academicService.transferClassStudents(params.id, dto, this.buildActor(user, request));
  }

  @Post("classes/:id/send-sms")
  @Permissions([AppPermission.ACADEMIC_MANAGE])
  @ApiOperation({
    summary: "Sinf o‘quvchilariga SMS yuborish",
    description:
      "Shablon yoki to‘g‘ridan-to‘g‘ri matn bilan SMS yuboriladi. studentIds berilmasa barcha o‘quvchilarga, " +
      "scheduledAt berilsa rejalashtiriladi, aks holda darhol yuboriladi. Qabul qiluvchi — o‘quvchining asosiy ota-onasi telefoni.",
  })
  @ApiParam(uuidParamDocs)
  @ApiBody({
    type: SendClassSmsDto,
    examples: {
      immediate: {
        summary: "Darhol yuborish (matn bilan)",
        value: { body: "Hurmatli ota-onalar, ertaga yig‘ilish bo‘ladi." },
      },
      scheduledTemplate: {
        summary: "Shablon bilan rejalashtirish",
        value: {
          templateId: "5c617a45-57a4-4864-89c8-96e299173908",
          scheduledAt: "2026-06-20T09:00:00.000Z",
        },
      },
    },
  })
  @ApiOkResponse({
    description: "SMS kampaniyasi yaratildi.",
    type: SendClassSmsResponseEnvelopeDto,
  })
  sendClassSms(
    @Param() params: UuidParamDto,
    @Body() dto: SendClassSmsDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
  ) {
    return this.academicService.sendClassSms(params.id, dto, this.buildActor(user, request));
  }
}
