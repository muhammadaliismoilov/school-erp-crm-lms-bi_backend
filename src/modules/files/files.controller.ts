import {
  Controller,
  Get,
  HttpException,
  HttpStatus,
  InternalServerErrorException,
  Param,
  ParseFilePipeBuilder,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiParam,
  ApiResponse,
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
import { FileStorageService } from "./file-storage.service";
import { StoredFile } from "./entities/stored-file.entity";
import { FileResponseSchema } from "./swagger/file-response.schema";

/** Minimal in-memory upload shape populated by Multer's memory storage. */
interface UploadedImage {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED_IMAGE_TYPES = /^image\/(png|jpe?g|webp|gif)$/;

@ApiTags("Fayllar")
@ApiBearerAuth()
@ApiLocalizedErrorResponses({ notFound: true })
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller({ path: "files", version: "1" })
export class FilesController {
  constructor(private readonly fileStorage: FileStorageService) {}

  @Post("upload")
  @Permissions([AppPermission.FILES_UPLOAD])
  @UseInterceptors(FileInterceptor("file"))
  @ApiConsumes("multipart/form-data")
  @ApiOperation({
    summary: "Rasm/fayl yuklash",
    description:
      "Multipart `file` maydonida rasm yuklaydi (PNG, JPG, WEBP, GIF — maksimal 5 MB) va object storage'ga saqlab, fayl IDsi hamda URL manzilini qaytaradi. Profil rasmi va logotiplar uchun ishlatiladi.",
  })
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        file: { type: "string", format: "binary" },
      },
      required: ["file"],
    },
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: "Fayl muvaffaqiyatli yuklandi.",
    type: FileResponseSchema,
  })
  async upload(
    @UploadedFile(
      new ParseFilePipeBuilder()
        .addFileTypeValidator({ fileType: ALLOWED_IMAGE_TYPES })
        .addMaxSizeValidator({ maxSize: MAX_IMAGE_SIZE })
        .build({
          errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
          fileIsRequired: true,
        }),
    )
    file: UploadedImage,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    try {
      const stored = await this.fileStorage.storeFile({
        fileName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        body: file.buffer,
        uploadedById: user.id,
      });

      return this.toFileResponse(stored);
    } catch (error) {
      this.handleError(error, "Faylni yuklashda server xatosi yuz berdi");
    }
  }

  @Get(":id")
  @Permissions([AppPermission.FILES_READ])
  @ApiOperation({
    summary: "Fayl ma'lumotini ID bo‘yicha olish",
    description: "Yuklangan faylning metama'lumotlari va URL manzilini qaytaradi.",
  })
  @ApiParam({ name: "id", description: "Fayl IDsi UUID formatida." })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Fayl ma'lumoti muvaffaqiyatli qaytarildi.",
    type: FileResponseSchema,
  })
  async findOne(@Param() params: UuidParamDto) {
    try {
      return this.toFileResponse(await this.fileStorage.findFile(params.id));
    } catch (error) {
      this.handleError(error, "Fayl ma'lumotini olishda server xatosi yuz berdi");
    }
  }

  private toFileResponse(file: StoredFile): FileResponseSchema {
    return {
      id: file.id,
      fileName: file.fileName,
      mimeType: file.mimeType,
      size: Number(file.size),
      url: file.fileUrl ?? null,
      createdAt: file.createdAt?.toISOString(),
    };
  }

  private handleError(error: unknown, fallbackMessage: string): never {
    if (error instanceof HttpException) {
      throw error;
    }

    throw new InternalServerErrorException(fallbackMessage);
  }
}
