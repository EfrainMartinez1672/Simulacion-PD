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
      'create' | 'update' | 'findById' | 'findAll' | 'findAllAssignedTo'
    >
  >;

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
    };
    service = new RequestsService(dao as unknown as RequestsDao);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('returns only requests assigned to an advisor', async () => {
    dao.findAllAssignedTo.mockResolvedValue([
      assignedRequest(1, 'advisor1'),
      assignedRequest(2, 'asesor-01'),
    ]);
    const advisor: AppUser = {
      id: 'advisor1',
      role: Role.ASESOR,
      assignmentAliases: ['asesor-01'],
    };

    const result = await service.findAll(advisor);

    expect(result.map(({ id }) => id)).toEqual([1, 2]);
    expect(dao.findAllAssignedTo).toHaveBeenCalledWith([
      'advisor1',
      'asesor-01',
    ]);
  });

  it('allows supervisors to see all requests', async () => {
    dao.findAll.mockResolvedValue([
      assignedRequest(1, 'advisor1'),
      assignedRequest(2, 'advisor2'),
    ]);
    const supervisor: AppUser = { id: 'supervisor1', role: Role.SUPERVISOR };

    const result = await service.findAll(supervisor);

    expect(result.map(({ id }) => id)).toEqual([1, 2]);
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
});
