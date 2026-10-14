import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { UsersService } from '../users/users.service';
import { Role } from '../users/enums/role.enum';
import { AppUser } from '../users/interfaces/app-user.interface';
import {
  AssignRequestDto,
  CreateRequestDto,
  PaginatedRequestsResponseDto,
  QueryRequestsDto,
  RequestHistoryResponseDto,
  RequestResponseDto,
  UpdateRequestStatusDto,
} from './dto/requests.dto';
import { CommercialRequestHistory } from './entities/commercial-request-history.entity';
import { Requests } from './entities/requests.entity';
import { RequestEventType } from './enums/request-event-type.enum';
import { RequestStatus } from './enums/request-status.enum';
import { RequestsDao } from './requests.dao';

/** Flujo permitido: pendiente -> en gestión -> resuelta; resuelta es final. */
const ALLOWED_TRANSITIONS: Record<RequestStatus, RequestStatus[]> = {
  [RequestStatus.PENDIENTE]: [RequestStatus.EN_GESTION],
  [RequestStatus.EN_GESTION]: [RequestStatus.RESUELTA],
  [RequestStatus.RESUELTA]: [],
};

/** Aplica las reglas de negocio y transforma entidades a respuestas de API. */
@Injectable()
export class RequestsService {
  constructor(
    private readonly dao: RequestsDao,
    private readonly dataSource?: DataSource,
    private readonly usersService?: UsersService,
  ) {}

  /** Ejecuta la operación dentro de una transacción cuando está disponible. */
  private async runTransaction<T>(
    operation: (manager?: any) => Promise<T>,
  ): Promise<T> {
    if (!this.dataSource?.transaction) {
      return operation();
    }

    return this.dataSource.transaction(operation);
  }

  /** Acepta tanto el ID actual como identificadores de asignación heredados. */
  private isAssignedToUser(request: Requests, user: AppUser): boolean {
    return (
      request.advisor === user.id ||
      user.assignmentAliases?.includes(request.advisor ?? '') === true
    );
  }

  /** Traduce nombres internos de persistencia al contrato público en español. */
  private mapToResponse(request: Requests): RequestResponseDto {
    return {
      id: request.id,
      cliente: request.client,
      descripcion: request.description,
      asesor: request.advisor,
      estado: request.status as RequestStatus,
      creadaEn: request.createdAt,
      actualizadaEn: request.updatedAt,
    };
  }

  /** Traduce un evento del historial a la respuesta HTTP pública. */
  private mapHistoryToResponse(
    event: CommercialRequestHistory,
  ): RequestHistoryResponseDto {
    return {
      id: event.id,
      solicitudId: event.solicitudId,
      tipoEvento: event.tipoEvento,
      valorAnterior: event.valorAnterior,
      valorNuevo: event.valorNuevo,
      usuarioActor: event.usuarioActor,
      fechaEvento: event.fechaEvento,
    };
  }

  /** Crea una solicitud; el DAO fuerza el estado inicial PENDIENTE. */
  async create(
    dto: CreateRequestDto,
    user?: AppUser,
  ): Promise<RequestResponseDto> {
    const advisor = user?.role === Role.ASESOR ? user.id : null;
    const actorId = user?.id ?? 'system';

    const createdRequest = await this.runTransaction(async (manager) => {
      const request = await (manager
        ? this.dao.create(dto, advisor, manager)
        : this.dao.create(dto, advisor));
      await (manager
        ? this.dao.createHistory(
            {
              solicitudId: request.id,
              tipoEvento: RequestEventType.CREACION,
              valorAnterior: null,
              valorNuevo: request.status,
              usuarioActor: actorId,
            },
            manager,
          )
        : this.dao.createHistory({
            solicitudId: request.id,
            tipoEvento: RequestEventType.CREACION,
            valorAnterior: null,
            valorNuevo: request.status,
            usuarioActor: actorId,
          }));

      return request;
    });

    return this.mapToResponse(createdRequest);
  }

  /** Filtra la lista en base de datos para mostrar solo asignaciones propias. */
  async findAll(
    user: AppUser,
    filters: QueryRequestsDto = new QueryRequestsDto(),
  ): Promise<PaginatedRequestsResponseDto> {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 10;
    const result = await this.dao.findPaginated(user, {
      ...filters,
      page,
      limit,
    });

    return {
      items: result.items.map((request) => this.mapToResponse(request)),
      pagination: {
        page,
        limit,
        total: result.total,
        totalPages: result.total === 0 ? 0 : Math.ceil(result.total / limit),
      },
    };
  }

  /** Busca por ID y oculta solicitudes no asignadas al asesor solicitante. */
  async findById(id: number, user: AppUser): Promise<RequestResponseDto> {
    const request = await this.dao.findById(id);

    if (
      !request ||
      (user.role === Role.ASESOR && !this.isAssignedToUser(request, user))
    ) {
      throw new NotFoundException(`Solicitud ${id} no encontrada`);
    }

    return this.mapToResponse(request);
  }

  /** Autoriza por asignación y valida el siguiente estado antes de persistirlo. */
  async updateStatus(
    id: number,
    dto: UpdateRequestStatusDto,
    user: AppUser,
  ): Promise<RequestResponseDto> {
    const request = await this.dao.findById(id);

    if (!request) {
      throw new NotFoundException(`Solicitud ${id} no encontrada`);
    }

    if (user.role === Role.ASESOR && !this.isAssignedToUser(request, user)) {
      throw new ForbiddenException(
        'No puedes cambiar el estado de una solicitud no asignada a ti',
      );
    }

    if (
      !ALLOWED_TRANSITIONS[request.status as RequestStatus]?.includes(
        dto.estado,
      )
    ) {
      throw new BadRequestException(
        `Transición inválida: ${request.status} -> ${dto.estado}`,
      );
    }

    const previousStatus = request.status;

    const updatedRequest = await this.runTransaction(async (manager) => {
      const savedRequest = await (manager
        ? this.dao.update(request, { status: dto.estado }, manager)
        : this.dao.update(request, { status: dto.estado }));

      await (manager
        ? this.dao.createHistory(
            {
              solicitudId: request.id,
              tipoEvento: RequestEventType.ESTADO,
              valorAnterior: previousStatus,
              valorNuevo: dto.estado,
              usuarioActor: user.id,
            },
            manager,
          )
        : this.dao.createHistory({
            solicitudId: request.id,
            tipoEvento: RequestEventType.ESTADO,
            valorAnterior: previousStatus,
            valorNuevo: dto.estado,
            usuarioActor: user.id,
          }));

      return savedRequest;
    });

    return this.mapToResponse(updatedRequest);
  }

  /** Reasigna una solicitud a un asesor válido sin tocar el estado. */
  async assignRequest(
    id: number,
    dto: AssignRequestDto,
    user: AppUser,
  ): Promise<RequestResponseDto> {
    const request = await this.dao.findById(id);

    if (!request) {
      throw new NotFoundException(`Solicitud ${id} no encontrada`);
    }

    if (user.role === Role.ASESOR) {
      throw new ForbiddenException(
        'Los asesores no pueden reasignar solicitudes',
      );
    }

    const assignedUser = this.usersService?.findAssessorById(dto.asesorId);

    if (!assignedUser) {
      throw new BadRequestException(
        `El asesor ${dto.asesorId} no existe o no tiene rol asesor`,
      );
    }

    if (request.status === RequestStatus.RESUELTA) {
      throw new ConflictException(
        'No se puede reasignar una solicitud en estado RESUELTA',
      );
    }

    const previousAdvisor = request.advisor;

    const updatedRequest = await this.runTransaction(async (manager) => {
      const savedRequest = await (manager
        ? this.dao.update(request, { advisor: dto.asesorId }, manager)
        : this.dao.update(request, { advisor: dto.asesorId }));

      await (manager
        ? this.dao.createHistory(
            {
              solicitudId: request.id,
              tipoEvento: RequestEventType.ASIGNACION,
              valorAnterior: previousAdvisor,
              valorNuevo: dto.asesorId,
              usuarioActor: user.id,
            },
            manager,
          )
        : this.dao.createHistory({
            solicitudId: request.id,
            tipoEvento: RequestEventType.ASIGNACION,
            valorAnterior: previousAdvisor,
            valorNuevo: dto.asesorId,
            usuarioActor: user.id,
          }));

      return savedRequest;
    });

    return this.mapToResponse(updatedRequest);
  }

  /** Consulta el historial de una solicitud con permisos por rol y asignación. */
  async getHistory(
    id: number,
    user: AppUser,
  ): Promise<RequestHistoryResponseDto[]> {
    const request = await this.dao.findById(id);

    if (!request) {
      throw new NotFoundException(`Solicitud ${id} no encontrada`);
    }

    if (
      user.role === Role.ASESOR &&
      !this.isAssignedToUser(request, user)
    ) {
      throw new ForbiddenException(
        'No tienes permiso para ver el historial de esta solicitud',
      );
    }

    const history = await this.dao.findHistoryByRequestId(id);
    return history.map((event) => this.mapHistoryToResponse(event));
  }
}
