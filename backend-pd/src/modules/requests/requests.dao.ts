import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { CreateRequestDto } from './dto/requests.dto';
import { Requests } from './entities/requests.entity';
import { RequestStatus } from './enums/request-status.enum';

/** Acceso a datos de solicitudes mediante el repositorio TypeORM. */
@Injectable()
export class RequestsDao {
  constructor(
    @InjectRepository(Requests) private readonly dao: Repository<Requests>,
  ) {}

  /** Persiste una solicitud nueva asignándole siempre el estado PENDIENTE. */
  create(data: CreateRequestDto): Promise<Requests> {
    const request = this.dao.create({
      client: data.cliente,
      description: data.descripcion,
      advisor: data.asesor,
      status: RequestStatus.PENDIENTE,
    });

    return this.dao.save(request);
  }

  /** Guarda cambios permitidos en una entidad existente. */
  update(
    request: Requests,
    changes: Partial<Pick<Requests, 'status'>>,
  ): Promise<Requests> {
    return this.dao.save(this.dao.merge(request, changes));
  }

  /** Busca una solicitud por su clave primaria. */
  findById(id: number): Promise<Requests | null> {
    return this.dao.findOne({ where: { id } });
  }

  /** Recupera todas las solicitudes para que el servicio aplique permisos. */
  findAll(): Promise<Requests[]> {
    return this.dao.find();
  }

  /** Aplica el filtro de asignación en SQL para no cargar solicitudes ajenas. */
  findAllAssignedTo(advisorIds: string[]): Promise<Requests[]> {
    if (advisorIds.length === 0) {
      return Promise.resolve([]);
    }

    return this.dao.find({ where: { advisor: In(advisorIds) } });
  }
}
