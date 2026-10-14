import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { ApiKeyGuard } from '../../common/guards/api-key.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { UserGuard } from '../../common/guards/user.guard';
import { Role } from '../users/enums/role.enum';
import { UsersService } from '../users/users.service';
import { QueryRequestsDto } from './dto/requests.dto';
import { RequestsController } from './requests.controller';
import { RequestsService } from './requests.service';

/** Comprueba el cableado del controlador y el paso de la identidad autenticada. */
describe('RequestsController', () => {
  let controller: RequestsController;
  let requestsService: {
    findAll: jest.Mock;
    findById: jest.Mock;
    create: jest.Mock;
    updateStatus: jest.Mock;
  };

  beforeEach(async () => {
    requestsService = {
      findAll: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
      updateStatus: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [RequestsController],
      providers: [
        {
          provide: RequestsService,
          useValue: requestsService,
        },
        ApiKeyGuard,
        UserGuard,
        RolesGuard,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn(() => 'clave-secreta-1'),
          },
        },
        {
          provide: UsersService,
          useValue: {
            findById: jest.fn(() => ({ id: 'advisor1', role: Role.ASESOR })),
          },
        },
      ],
    }).compile();

    controller = module.get<RequestsController>(RequestsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('passes the query filters and authenticated user when listing requests', async () => {
    const user = { id: 'supervisor1', role: Role.SUPERVISOR };
    const query = { page: 2, limit: 5 } as QueryRequestsDto;

    await controller.getAll(query, { user });

    expect(requestsService.findAll).toHaveBeenCalledWith(user, query);
  });

  it('passes the request ID and authenticated user when fetching one request', async () => {
    const user = { id: 'advisor1', role: Role.ASESOR };

    await controller.getById(7, { user });

    expect(requestsService.findById).toHaveBeenCalledWith(7, user);
  });

  it('passes the authenticated user when changing request status', async () => {
    const user = { id: 'advisor1', role: Role.ASESOR };
    const body = { estado: 'EN_GESTION' } as never;

    await controller.updateStatus(1, body, { user });

    expect(requestsService.updateStatus).toHaveBeenCalledWith(1, body, user);
  });
});
