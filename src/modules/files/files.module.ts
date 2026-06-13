import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { StorageModule } from "../storage/storage.module";
import { FileStorageService } from "./file-storage.service";
import { FilesController } from "./files.controller";
import { FilesService } from "./files.service";
import { StoredFile } from "./entities/stored-file.entity";

@Module({
  imports: [TypeOrmModule.forFeature([StoredFile]), StorageModule],
  providers: [FilesService, FileStorageService],
  controllers: [FilesController],
  exports: [FilesService, FileStorageService],
})
export class FilesModule {}
