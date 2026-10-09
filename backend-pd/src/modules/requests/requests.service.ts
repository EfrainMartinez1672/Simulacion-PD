import { Injectable } from '@nestjs/common';
import { CreateRequestDto } from './dto/requests.dto';
import { Requests } from './entities/requests.entity';
import { RequestsDao } from './requests.dao';

@Injectable()
export class RequestsService {
  constructor(private readonly dao: RequestsDao) {}

  async create(dto: CreateRequestDto): Promise<Requests> {
    return this.dao.create(dto);
  }
}
