import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
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
  CreateRequestDto,
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
    description: 'Listado de solicitudes',
    type: [RequestResponseDto],
  })
  getAll(@Req() request: { user: AppUser }): Promise<RequestResponseDto[]> {
    return this.requestsService.findAll(request.user);
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
  create(@Body() body: CreateRequestDto): Promise<RequestResponseDto> {
    return this.requestsService.create(body);
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
  @ApiResponse({
    status: 404,
    description: 'Solicitud no encontrada o no asignada al asesor',
  })
  updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateRequestStatusDto,
    @Req() request: { user: AppUser },
  ): Promise<RequestResponseDto> {
    return this.requestsService.updateStatus(id, body, request.user);
  }
}
