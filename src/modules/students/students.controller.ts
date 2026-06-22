import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from "@nestjs/swagger";
import { AppPermission } from "../../common/constants/permissions";
import { Permissions } from "../../common/decorators/permissions.decorator";
import { UuidParamDto } from "../../common/dto/uuid-param.dto";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { PermissionsGuard } from "../../common/guards/permissions.guard";
import { ApiLocalizedErrorResponses } from "../../common/swagger/api-localized-error-responses.decorator";
import { CreateDocumentDto } from "./dto/create-document.dto";
import { CreateParentDto } from "./dto/create-parent.dto";
import { CreateStudentDto } from "./dto/create-student.dto";
import { LinkParentDto } from "./dto/link-parent.dto";
import { QueryDepartedDto } from "./dto/query-departed.dto";
import { QueryStudentsDto } from "./dto/query-students.dto";
import { UpdateStudentDto } from "./dto/update-student.dto";
import { WithdrawStudentDto } from "./dto/withdraw-student.dto";
import { StudentsService } from "./students.service";

@ApiTags("O‘quvchilar")
@ApiBearerAuth()
@ApiLocalizedErrorResponses({ notFound: true })
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller({ path: "students", version: "1" })
export class StudentsController {
  constructor(private readonly studentsService: StudentsService) {}

  @Get()
  @Permissions([AppPermission.STUDENTS_READ])
  @ApiOperation({ summary: "O‘quvchilar ro‘yxatini sahifalab olish" })
  @ApiOkResponse({ description: "O‘quvchilar ro‘yxati sahifalab qaytarildi." })
  findAll(@Query() query: QueryStudentsDto) {
    return this.studentsService.findStudents(query);
  }

  @Get("stats")
  @Permissions([AppPermission.STUDENTS_READ])
  @ApiOperation({ summary: "O‘quvchilar statistikasi (jami / erkak / ayol / shu oyda)" })
  @ApiOkResponse({ description: "Statistika qaytarildi." })
  stats() {
    return this.studentsService.getStats();
  }

  @Get("departed")
  @Permissions([AppPermission.STUDENTS_READ])
  @ApiOperation({ summary: "Ketgan o‘quvchilar ro‘yxati (soft-delete qilingan)" })
  @ApiOkResponse({ description: "Ketgan o‘quvchilar ro‘yxati qaytarildi." })
  findDeparted(@Query() query: QueryDepartedDto) {
    return this.studentsService.findDeparted(query);
  }

  @Get("departed/stats")
  @Permissions([AppPermission.STUDENTS_READ])
  @ApiOperation({ summary: "Ketgan o‘quvchilar statistikasi (jami / erkak / ayol)" })
  @ApiOkResponse({ description: "Statistika qaytarildi." })
  departedStats() {
    return this.studentsService.getDepartedStats();
  }

  @Post()
  @Permissions([AppPermission.STUDENTS_MANAGE])
  @ApiOperation({ summary: "O‘quvchi yaratish" })
  @ApiCreatedResponse({ description: "O‘quvchi yaratildi." })
  create(@Body() dto: CreateStudentDto) {
    return this.studentsService.createStudent(dto);
  }

  @Get(":id")
  @Permissions([AppPermission.STUDENTS_READ])
  @ApiOperation({ summary: "O‘quvchini ID bo‘yicha olish" })
  @ApiOkResponse({ description: "O‘quvchi qaytarildi." })
  findOne(@Param() params: UuidParamDto) {
    return this.studentsService.findStudent(params.id);
  }

  @Patch(":id")
  @Permissions([AppPermission.STUDENTS_MANAGE])
  @ApiOperation({ summary: "O‘quvchini tahrirlash" })
  @ApiOkResponse({ description: "O‘quvchi tahrirlandi." })
  update(@Param() params: UuidParamDto, @Body() dto: UpdateStudentDto) {
    return this.studentsService.updateStudent(params.id, dto);
  }

  @Delete(":id")
  @Permissions([AppPermission.STUDENTS_MANAGE])
  @ApiOperation({ summary: "O‘quvchini o‘chirish (soft-delete, ketish sababi bilan)" })
  @ApiOkResponse({ description: "O‘quvchi o‘chirildi." })
  remove(@Param() params: UuidParamDto, @Body() dto: WithdrawStudentDto) {
    return this.studentsService.removeStudent(params.id, dto?.reason);
  }

  @Post(":id/restore")
  @Permissions([AppPermission.STUDENTS_MANAGE])
  @ApiOperation({ summary: "Ketgan o‘quvchini tiklash" })
  @ApiOkResponse({ description: "O‘quvchi tiklandi." })
  restore(@Param() params: UuidParamDto) {
    return this.studentsService.restoreStudent(params.id);
  }

  @Delete(":id/permanent")
  @Permissions([AppPermission.STUDENTS_MANAGE])
  @ApiOperation({ summary: "Ketgan o‘quvchini butunlay o‘chirish" })
  @ApiOkResponse({ description: "O‘quvchi butunlay o‘chirildi." })
  removePermanent(@Param() params: UuidParamDto) {
    return this.studentsService.permanentlyRemoveStudent(params.id);
  }

  @Post("parents")
  @Permissions([AppPermission.STUDENTS_MANAGE])
  @ApiOperation({ summary: "Ota-ona yoki vasiy yozuvini yaratish" })
  @ApiCreatedResponse({ description: "Ota-ona yozuvi yaratildi." })
  createParent(@Body() dto: CreateParentDto) {
    return this.studentsService.createParent(dto);
  }

  @Get("parents/children-map")
  @Permissions([AppPermission.STUDENTS_READ])
  @ApiOperation({ summary: "Bir nechta ota-ona uchun farzandlar (ids=a,b,c)" })
  @ApiOkResponse({ description: "Ota-ona → farzandlar xaritasi qaytarildi." })
  findChildrenMap(@Query("ids") ids?: string) {
    const list = (ids ?? "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);
    return this.studentsService.childrenByParents(list);
  }

  @Get("parents/:parentId/children")
  @Permissions([AppPermission.STUDENTS_READ])
  @ApiOperation({ summary: "Ota-onaga biriktirilgan o‘quvchilar (farzandlar)" })
  @ApiOkResponse({ description: "Farzandlar ro‘yxati qaytarildi." })
  findChildren(@Param("parentId") parentId: string) {
    return this.studentsService.findChildren(parentId);
  }

  @Post(":id/parents")
  @Permissions([AppPermission.STUDENTS_MANAGE])
  @ApiOperation({ summary: "Ota-ona yoki vasiyni o‘quvchiga bog‘lash" })
  @ApiCreatedResponse({ description: "Ota-ona o‘quvchiga bog‘landi." })
  linkParent(@Param() params: UuidParamDto, @Body() dto: LinkParentDto) {
    return this.studentsService.linkParent(params.id, dto);
  }

  @Delete(":id/parents/:parentId")
  @Permissions([AppPermission.STUDENTS_MANAGE])
  @ApiOperation({ summary: "O‘quvchini ota-onadan ajratish (bog‘lanishni uzish)" })
  @ApiOkResponse({ description: "Bog‘lanish uzildi." })
  unlinkParent(@Param("id") id: string, @Param("parentId") parentId: string) {
    return this.studentsService.unlinkParent(id, parentId);
  }

  @Get(":id/documents")
  @Permissions([AppPermission.STUDENTS_READ])
  @ApiOperation({ summary: "O‘quvchi hujjatlari ro‘yxati" })
  @ApiOkResponse({ description: "Hujjatlar qaytarildi." })
  listDocuments(@Param() params: UuidParamDto) {
    return this.studentsService.listDocuments(params.id);
  }

  @Post(":id/documents")
  @Permissions([AppPermission.STUDENTS_MANAGE])
  @ApiOperation({ summary: "O‘quvchiga hujjat qo‘shish" })
  @ApiCreatedResponse({ description: "Hujjat qo‘shildi." })
  addDocument(@Param() params: UuidParamDto, @Body() dto: CreateDocumentDto) {
    return this.studentsService.addDocument(params.id, dto);
  }

  @Delete(":id/documents/:documentId")
  @Permissions([AppPermission.STUDENTS_MANAGE])
  @ApiOperation({ summary: "O‘quvchi hujjatini o‘chirish" })
  @ApiOkResponse({ description: "Hujjat o‘chirildi." })
  removeDocument(
    @Param("id") id: string,
    @Param("documentId") documentId: string,
  ) {
    return this.studentsService.removeDocument(id, documentId);
  }
}
