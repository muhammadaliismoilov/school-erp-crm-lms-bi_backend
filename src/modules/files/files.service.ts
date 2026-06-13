import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StoredFile } from './entities/stored-file.entity';

@Injectable()
export class FilesService {
  constructor(
    @InjectRepository(StoredFile)
    private readonly files: Repository<StoredFile>,
  ) {}
}
