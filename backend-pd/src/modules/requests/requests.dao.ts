import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, In, Repository } from 'typeorm';
import { Role } from '../users/enums/role.enum';
import { AppUser } from '../users/interfaces/app-user.interface';
import { CreateRequestDto, QueryRequestsDto } from './dto/requests.dto';
import { CommercialRequestHistory } from './entities/commercial-request-history.entity';
import { Requests } from './entities/requests.entity';
import { RequestStatus } from './enums/request-status.enum';

/** Acceso a datos de solicitudes mediante el repositorio TypeORM. */
@Injectable()
export class RequestsDao {
  constructor(
    @InjectRepository(Requests) private readonly dao: Repository<Requests>,
    @InjectRepository(CommercialRequestHistory)
    private readonly historyDao: Repository<CommercialRequestHistory>,
  ) {}

  /** Persiste una solicitud nueva asignándole siempre el estado PENDIENTE. */
  create(
    data: CreateRequestDto,
    advisor: string | null = null,
    manager?: EntityManager,
  ): Promise<Requests> {
    const repo = manager ? manager.getRepository(Requests) : this.dao;
    const request = repo.create({
      client: data.cliente,
      description: data.descripcion,
      advisor,
      status: RequestStatus.PENDIENTE,
    });

    return repo.save(request);
  }

  /** Guarda cambios permitidos en una entidad existente. */
  update(
    request: Requests,
    changes: Partial<Pick<Requests, 'status' | 'advisor'>>,
    manager?: EntityManager,
  ): Promise<Requests> {
    const repo = manager ? manager.getRepository(Requests) : this.dao;
    return repo.save(repo.merge(request, changes));
  }

  /** Busca una solicitud por su clave primaria. */
  findById(id: number, manager?: EntityManager): Promise<Requests | null> {
    const repo = manager ? manager.getRepository(Requests) : this.dao;
    return repo.findOne({ where: { id } });
  }

  /** Recupera todas las solicitudes para que el servicio aplique permisos. */
  findAll(): Promise<Requests[]> {
    return this.dao.find({ order: { createdAt: 'DESC' } });
  }

  /** Aplica el filtro de asignación en SQL para no cargar solicitudes ajenas. */
  findAllAssignedTo(advisorIds: string[]): Promise<Requests[]> {
    if (advisorIds.length === 0) {
      return Promise.resolve([]);
    }

    return this.dao.find({
      where: { advisor: In(advisorIds) },
      order: { createdAt: 'DESC' },
    });
  }

  /** Registra un evento en el historial de la solicitud. */
  createHistory(
    data: Partial<CommercialRequestHistory>,
    manager?: EntityManager,
  ): Promise<CommercialRequestHistory> {
    const repo = manager
      ? manager.getRepository(CommercialRequestHistory)
      : this.historyDao;
    const record = repo.create(data as Partial<CommercialRequestHistory>);
    return repo.save(record);
  }

  /** Lista el historial de una solicitud ordenado por fecha ascendente. */
  findHistoryByRequestId(
    solicitudId: number,
    manager?: EntityManager,
  ): Promise<CommercialRequestHistory[]> {
    const repo = manager
      ? manager.getRepository(CommercialRequestHistory)
      : this.historyDao;
    return repo.find({
      where: { solicitudId },
      order: { fechaEvento: 'ASC' },
    });
  }

  /** Recupera solicitudes paginadas con filtros y visibilidad por rol. */
  async findPaginated(
    user: AppUser,
    filters: QueryRequestsDto,
  ): Promise<{ items: Requests[]; total: number }> {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 10;
    const qb = this.dao.createQueryBuilder('request');

    if (filters.estado) {
      qb.andWhere('request.status = :estado', { estado: filters.estado });
    }

    if (filters.cliente) {
      qb.andWhere('LOWER(request.client) LIKE LOWER(:cliente)', {
        cliente: `%${filters.cliente.trim()}%`,
      });
    }

    if (filters.desde) {
      qb.andWhere('request.createdAt >= :desde', {
        desde: new Date(filters.desde),
      });
    }

    if (filters.hasta) {
      qb.andWhere('request.createdAt <= :hasta', {
        hasta: new Date(filters.hasta),
      });
    }

    if (user.role === Role.ASESOR) {
      const advisorIds = [user.id, ...(user.assignmentAliases ?? [])];
      qb.andWhere('request.advisor IN (:...advisorIds)', { advisorIds });
      if (filters.asesor) {
        qb.andWhere('request.advisor = :advisorId', { advisorId: user.id });
      }
    } else if (filters.asesor) {
      qb.andWhere('request.advisor = :asesorId', { asesorId: filters.asesor });
    }

    const countQuery = qb.clone();
    const total = await countQuery.getCount();

    qb.orderBy('request.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    return {
      items: await qb.getMany(),
      total,
    };
  }
}
