import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Role } from '../users/enums/role.enum';
import { AppUser } from '../users/interfaces/app-user.interface';
import { Requests } from './entities/requests.entity';
import { RequestStatus } from './enums/request-status.enum';
import { RequestsDao } from './requests.dao';
import { RequestsService } from './requests.service';

/** Prueba reglas de visibilidad y actualización de solicitudes por rol/asignación. */
describe('RequestsService', () => {
  let service: RequestsService;
  let dao: jest.Mocked<
    Pick<
      RequestsDao,
      | 'create'
      | 'update'
      | 'findById'
      | 'findAll'
      | 'findAllAssignedTo'
      | 'findPaginated'
      | 'createHistory'
      | 'findHistoryByRequestId'
    >
  >;
  let usersService: { findAssessorById: jest.Mock };

  /** Genera una entidad mínima para aislar las pruebas de permisos. */
  const assignedRequest = (id: number, advisor: string): Requests =>
    ({
      id,
      client: `client-${id}`,
      description: `description-${id}`,
      advisor,
      status: RequestStatus.PENDIENTE,
      createdAt: new Date('2025-01-01T00:00:00.000Z'),
      updatedAt: new Date('2025-01-01T00:00:00.000Z'),
    }) as Requests;

  beforeEach(async () => {
    dao = {
      create: jest.fn(),
      update: jest.fn(),
      findById: jest.fn(),
      findAll: jest.fn(),
      findAllAssignedTo: jest.fn(),
      findPaginated: jest.fn(),
      createHistory: jest.fn(),
      findHistoryByRequestId: jest.fn(),
    };
    usersService = {
      findAssessorById: jest.fn(),
    };
    service = new RequestsService(
      dao as unknown as RequestsDao,
      undefined,
      usersService as any,
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('returns a paginated list for an advisor', async () => {
    dao.findPaginated.mockResolvedValue({
      items: [assignedRequest(1, 'advisor1'), assignedRequest(2, 'asesor-01')],
      total: 2,
    });
    const advisor: AppUser = {
      id: 'advisor1',
      role: Role.ASESOR,
      assignmentAliases: ['asesor-01'],
    };

    const result = await service.findAll(advisor);

    expect(result.items.map(({ id }) => id)).toEqual([1, 2]);
    expect(result.pagination).toEqual({
      page: 1,
      limit: 10,
      total: 2,
      totalPages: 1,
    });
    expect(dao.findPaginated).toHaveBeenCalledWith(advisor, {
      page: 1,
      limit: 10,
    });
  });

  it('allows supervisors to see all requests in paginated format', async () => {
    dao.findPaginated.mockResolvedValue({
      items: [assignedRequest(1, 'advisor1'), assignedRequest(2, 'advisor2')],
      total: 2,
    });
    const supervisor: AppUser = { id: 'supervisor1', role: Role.SUPERVISOR };

    const result = await service.findAll(supervisor);

    expect(result.items.map(({ id }) => id)).toEqual([1, 2]);
    expect(result.pagination.total).toBe(2);
  });

  it('does not expose another advisor request by ID', async () => {
    dao.findById.mockResolvedValue(assignedRequest(2, 'advisor2'));
    const advisor: AppUser = { id: 'advisor1', role: Role.ASESOR };

    await expect(service.findById(2, advisor)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('allows an advisor to update a request assigned to them', async () => {
    const request = assignedRequest(1, 'advisor1');
    const updatedRequest = { ...request, status: RequestStatus.EN_GESTION };
    dao.findById.mockResolvedValue(request);
    dao.update.mockResolvedValue(updatedRequest);
    const advisor: AppUser = { id: 'advisor1', role: Role.ASESOR };

    const result = await service.updateStatus(
      1,
      { estado: RequestStatus.EN_GESTION },
      advisor,
    );

    expect(dao.update).toHaveBeenCalledWith(request, {
      status: RequestStatus.EN_GESTION,
    });
    expect(result.estado).toBe(RequestStatus.EN_GESTION);
  });

  it('does not allow an advisor to update a request assigned to someone else', async () => {
    const request = assignedRequest(2, 'advisor2');
    dao.findById.mockResolvedValue(request);
    const advisor: AppUser = { id: 'advisor1', role: Role.ASESOR };

    await expect(
      service.updateStatus(2, { estado: RequestStatus.EN_GESTION }, advisor),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(dao.update).not.toHaveBeenCalled();
  });

  it('allows an advisor to update a request assigned through a legacy alias', async () => {
    const request = assignedRequest(1, 'asesor-01');
    const updatedRequest = { ...request, status: RequestStatus.EN_GESTION };
    dao.findById.mockResolvedValue(request);
    dao.update.mockResolvedValue(updatedRequest);
    const advisor: AppUser = {
      id: 'advisor1',
      role: Role.ASESOR,
      assignmentAliases: ['asesor-01'],
    };

    const result = await service.updateStatus(
      1,
      { estado: RequestStatus.EN_GESTION },
      advisor,
    );

    expect(result.estado).toBe(RequestStatus.EN_GESTION);
  });

  it('rejects jumping from pending directly to resolved', async () => {
    dao.findById.mockResolvedValue(assignedRequest(1, 'advisor1'));
    const advisor: AppUser = { id: 'advisor1', role: Role.ASESOR };

    await expect(
      service.updateStatus(1, { estado: RequestStatus.RESUELTA }, advisor),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(dao.update).not.toHaveBeenCalled();
  });

  it('assigns a request to a valid assessor and records an ASIGNACION event', async () => {
    const request = assignedRequest(1, 'advisor1');
    const updatedRequest = { ...request, advisor: 'asesor02' };
    dao.findById.mockResolvedValue(request);
    dao.update.mockResolvedValue(updatedRequest);
    usersService.findAssessorById.mockReturnValue({
      id: 'asesor02',
      role: Role.ASESOR,
    });
    const supervisor: AppUser = { id: 'supervisor1', role: Role.SUPERVISOR };

    const result = await service.assignRequest(
      1,
      { asesorId: 'asesor02' },
      supervisor,
    );

    expect(dao.update).toHaveBeenCalledWith(request, { advisor: 'asesor02' });
    expect(dao.createHistory).toHaveBeenCalledWith(
      expect.objectContaining({
        solicitudId: 1,
        tipoEvento: 'ASIGNACION',
        valorAnterior: 'advisor1',
        valorNuevo: 'asesor02',
      }),
    );
    expect(result.asesor).toBe('asesor02');
  });

  it('rejects assignment when the target user is not a valid assessor', async () => {
    const request = assignedRequest(1, 'advisor1');
    dao.findById.mockResolvedValue(request);
    usersService.findAssessorById.mockReturnValue(undefined);
    const supervisor: AppUser = { id: 'supervisor1', role: Role.SUPERVISOR };

    await expect(
      service.assignRequest(1, { asesorId: 'admin1' }, supervisor),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(dao.update).not.toHaveBeenCalled();
  });

  it('refuses to create a request with a supervisor as assigned advisor', async () => {
    const createdRequest = {
      id: 7,
      client: 'client-7',
      description: 'desc-7',
      advisor: null,
      status: RequestStatus.PENDIENTE,
      createdAt: new Date('2025-01-01T00:00:00.000Z'),
      updatedAt: new Date('2025-01-01T00:00:00.000Z'),
    } as Requests;
    dao.create.mockResolvedValue(createdRequest);
    const supervisor: AppUser = { id: 'supervisor1', role: Role.SUPERVISOR };

    const result = await service.create(
      { cliente: 'client-7', descripcion: 'desc-7' },
      supervisor,
    );

    expect(dao.create).toHaveBeenCalledWith(
      { cliente: 'client-7', descripcion: 'desc-7' },
      null,
    );
    expect(result.asesor).toBeNull();
  });
});
