import { Injectable, NotFoundException } from '@nestjs/common';
import { Role } from '../users/enums/role.enum';
import { AppUser } from '../users/interfaces/app-user.interface';
import {
  CreateRequestDto,
  RequestResponseDto,
  UpdateRequestStatusDto,
} from './dto/requests.dto';
import { Requests } from './entities/requests.entity';
import { RequestStatus } from './enums/request-status.enum';
import { RequestsDao } from './requests.dao';

/** Aplica las reglas de negocio y transforma entidades a respuestas de API. */
@Injectable()
export class RequestsService {
  constructor(private readonly dao: RequestsDao) {}

  /** Acepta tanto el ID actual como identificadores de asignación heredados. */
  private isAssignedToUser(request: Requests, user: AppUser): boolean {
    return (
      request.advisor === user.id ||
      user.assignmentAliases?.includes(request.advisor) === true
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

  /** Crea una solicitud; el DAO fuerza el estado inicial PENDIENTE. */
  async create(dto: CreateRequestDto): Promise<RequestResponseDto> {
    const createdRequest = await this.dao.create(dto);
    return this.mapToResponse(createdRequest);
  }

  /** Filtra la lista: asesores solo ven asignaciones propias. */
  async findAll(user: AppUser): Promise<RequestResponseDto[]> {
    const result = await this.dao.findAll();
    const visibleRequests =
      user.role === Role.ASESOR
        ? result.filter((request) => this.isAssignedToUser(request, user))
        : result;

    return visibleRequests.map((request) => this.mapToResponse(request));
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

  /** Actualiza el estado si la solicitud existe y pertenece al asesor indicado. */
  async updateStatus(
    id: number,
    dto: UpdateRequestStatusDto,
    user: AppUser,
  ): Promise<RequestResponseDto> {
    const request = await this.dao.findById(id);

    if (
      !request ||
      (user.role === Role.ASESOR && !this.isAssignedToUser(request, user))
    ) {
      throw new NotFoundException(`Solicitud ${id} no encontrada`);
    }

    const updatedRequest = await this.dao.update(request, {
      status: dto.estado,
    });

    return this.mapToResponse(updatedRequest);
  }
}
