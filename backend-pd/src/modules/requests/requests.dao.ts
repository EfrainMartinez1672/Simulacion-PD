import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateRequestDto } from './dto/requests.dto';
import { Requests } from './entities/requests.entity';

@Injectable()
export class RequestsDao {
  constructor(
    @InjectRepository(Requests) private readonly dao: Repository<Requests>,
  ) {}

  create(data: CreateRequestDto): Promise<Requests> {
    const request = this.dao.create({
      description: data.description,
      advisor: data.advisor,
      status: data.status,
      client: { id: data.clientId },
    });

    return this.dao.save(request);
  }

  update(
    request: Requests,
    changes: Partial<Pick<Requests, 'status'>>,
  ): Promise<Requests> {
    return this.dao.save(this.dao.merge(request, changes));
  }

  findById(id: number): Promise<Requests | null> {
    return this.dao.findOne({where: { id }});
  }

  findAll(): Promise<Requests[]> {
    return this.dao.find();
  }

  findByIdClient() {
    return;
  }
}
