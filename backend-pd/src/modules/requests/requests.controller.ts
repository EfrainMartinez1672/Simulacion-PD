import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import {
  ApiHeader,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
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
import { RequestsService } from './requests.service';

/** Define las rutas REST y sus permisos para las solicitudes comerciales. */
@ApiTags('Solicitudes')
@ApiHeader({
  name: 'x-api-key',
  required: true,
  description: 'API key de acceso',
})
@ApiHeader({
  name: 'x-user',
  required: true,
  description: 'Identificador del usuario autenticado',
})
@Controller('solicitudes')
export class RequestsController {
  constructor(private readonly requestsService: RequestsService) {}

  /** Lista todas las solicitudes visibles para el usuario autenticado. */
  @Get()
  @Roles(Role.ADMIN, Role.SUPERVISOR, Role.ASESOR)
  @ApiOperation({ summary: 'Listar solicitudes' })
  @ApiResponse({
    status: 200,
    description: 'Listado paginado de solicitudes',
    type: PaginatedRequestsResponseDto,
  })
  getAll(
    @Query() query: QueryRequestsDto,
    @Req() request: { user: AppUser },
  ): Promise<PaginatedRequestsResponseDto> {
    return this.requestsService.findAll(request.user, query);
  }

  /** Recupera una solicitud por ID y aplica el filtro de asignación del asesor. */
  @Get(':id')
  @Roles(Role.ADMIN, Role.SUPERVISOR, Role.ASESOR)
  @ApiOperation({ summary: 'Buscar solicitud por identificador' })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'Identificador de la solicitud',
  })
  @ApiResponse({
    status: 200,
    description: 'Solicitud encontrada',
    type: RequestResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Solicitud no encontrada' })
  getById(
    @Param('id', ParseIntPipe) id: number,
    @Req() request: { user: AppUser },
  ): Promise<RequestResponseDto> {
    return this.requestsService.findById(id, request.user);
  }

  /** Crea una solicitud; el estado inicial lo asigna el servidor. */
  @Post()
  @Roles(Role.ADMIN, Role.SUPERVISOR, Role.ASESOR)
  @ApiOperation({ summary: 'Crear solicitud' })
  @ApiResponse({
    status: 201,
    description: 'Solicitud creada',
    type: RequestResponseDto,
  })
  create(
    @Body() body: CreateRequestDto,
    @Req() request: { user: AppUser },
  ): Promise<RequestResponseDto> {
    return this.requestsService.create(body, request.user);
  }

  /** Cambia el estado; un asesor solo puede modificar solicitudes asignadas. */
  @Patch(':id/estado')
  @Roles(Role.ADMIN, Role.SUPERVISOR, Role.ASESOR)
  @ApiOperation({ summary: 'Actualizar estado de la solicitud' })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'Identificador de la solicitud',
  })
  @ApiResponse({
    status: 200,
    description: 'Solicitud actualizada',
    type: RequestResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Transición de estado inválida' })
  @ApiResponse({
    status: 403,
    description: 'Solicitud asignada a otro asesor',
  })
  @ApiResponse({
    status: 404,
    description: 'Solicitud no encontrada',
  })
  updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateRequestStatusDto,
    @Req() request: { user: AppUser },
  ): Promise<RequestResponseDto> {
    return this.requestsService.updateStatus(id, body, request.user);
  }

  /** Asigna o reasigna una solicitud a un asesor válido. */
  @Patch(':id/asignacion')
  @Roles(Role.ADMIN, Role.SUPERVISOR)
  @ApiOperation({ summary: 'Asignar solicitud a un asesor' })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'Identificador de la solicitud',
  })
  @ApiResponse({
    status: 200,
    description: 'Solicitud reasignada',
    type: RequestResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'El asesor destino no existe o no es válido',
  })
  @ApiResponse({
    status: 403,
    description: 'Los asesores no pueden reasignar solicitudes',
  })
  @ApiResponse({ status: 404, description: 'Solicitud no encontrada' })
  @ApiResponse({
    status: 409,
    description: 'No se puede reasignar una solicitud resuelta',
  })
  assignRequest(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: AssignRequestDto,
    @Req() request: { user: AppUser },
  ): Promise<RequestResponseDto> {
    return this.requestsService.assignRequest(id, body, request.user);
  }

  /** Devuelve el historial de eventos de una solicitud. */
  @Get(':id/historial')
  @Roles(Role.ADMIN, Role.SUPERVISOR, Role.ASESOR)
  @ApiOperation({ summary: 'Consultar historial de una solicitud' })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'Identificador de la solicitud',
  })
  @ApiResponse({
    status: 200,
    description: 'Historial de la solicitud',
    type: [RequestHistoryResponseDto],
  })
  getHistory(
    @Param('id', ParseIntPipe) id: number,
    @Req() request: { user: AppUser },
  ): Promise<RequestHistoryResponseDto[]> {
    return this.requestsService.getHistory(id, request.user);
  }
}
