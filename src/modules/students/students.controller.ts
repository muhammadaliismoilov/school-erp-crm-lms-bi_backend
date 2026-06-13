import {
  Body,
  Controller,
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
import { PaginationQueryDto } from "../../common/dto/pagination-query.dto";
import { UuidParamDto } from "../../common/dto/uuid-param.dto";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { PermissionsGuard } from "../../common/guards/permissions.guard";
import { ApiLocalizedErrorResponses } from "../../common/swagger/api-localized-error-responses.decorator";
import { CreateParentDto } from "./dto/create-parent.dto";
import { CreateStudentDto } from "./dto/create-student.dto";
import { LinkParentDto } from "./dto/link-parent.dto";
import { UpdateStudentDto } from "./dto/update-student.dto";
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
  findAll(@Query() query: PaginationQueryDto) {
    return this.studentsService.findStudents(query);
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

  @Post("parents")
  @Permissions([AppPermission.STUDENTS_MANAGE])
  @ApiOperation({ summary: "Ota-ona yoki vasiy yozuvini yaratish" })
  @ApiCreatedResponse({ description: "Ota-ona yozuvi yaratildi." })
  createParent(@Body() dto: CreateParentDto) {
    return this.studentsService.createParent(dto);
  }

  @Post(":id/parents")
  @Permissions([AppPermission.STUDENTS_MANAGE])
  @ApiOperation({ summary: "Ota-ona yoki vasiyni o‘quvchiga bog‘lash" })
  @ApiCreatedResponse({ description: "Ota-ona o‘quvchiga bog‘landi." })
  linkParent(@Param() params: UuidParamDto, @Body() dto: LinkParentDto) {
    return this.studentsService.linkParent(params.id, dto);
  }
}
