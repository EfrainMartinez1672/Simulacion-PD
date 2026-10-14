import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsDefined,
  IsEnum,
  IsInt,
  IsISO8601,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
} from 'class-validator';
import { RequestEventType } from '../enums/request-event-type.enum';
import { RequestStatus } from '../enums/request-status.enum';

function IsDateRangeValid(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isDateRangeValid',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(_value: unknown, args: ValidationArguments) {
          const obj = args.object as Record<string, unknown>;
          const desde = obj.desde as string | undefined;
          const hasta = obj.hasta as string | undefined;

          if (!desde || !hasta) {
            return true;
          }

          return new Date(desde).getTime() <= new Date(hasta).getTime();
        },
        defaultMessage() {
          return 'La fecha "desde" no puede ser posterior a "hasta".';
        },
      },
    });
  };
}

/** Campos admitidos para crear solicitudes; no permite definir estado desde el cliente. */
export class CreateRequestDto {
  @ApiProperty({
    example: 'cliente-001',
    description: 'Identificador del cliente',
  })
  @IsDefined()
  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  cliente: string;

  @ApiProperty({
    example: 'Necesita revisión de la nueva campaña',
    description: 'Descripción de la solicitud',
  })
  @IsDefined()
  @IsString()
  @IsNotEmpty()
  @MaxLength(1040)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  descripcion: string;
}

/** Cuerpo permitido para cambiar el estado de una solicitud existente. */
export class UpdateRequestStatusDto {
  @ApiProperty({ enum: RequestStatus, description: 'Nuevo estado' })
  @IsDefined()
  @IsEnum(RequestStatus)
  @Type(() => String)
  estado: RequestStatus;
}

/** Reasigna la solicitud a un asesor existente. */
export class AssignRequestDto {
  @ApiProperty({
    example: 'asesor02',
    description: 'Identificador del asesor al que se asigna la solicitud',
  })
  @IsDefined()
  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  asesorId: string;
}

/** Filtros y paginación para listar solicitudes. */
export class QueryRequestsDto {
  @ApiPropertyOptional({ enum: RequestStatus, description: 'Filtrar por estado' })
  @IsOptional()
  @IsEnum(RequestStatus)
  @Type(() => String)
  estado?: RequestStatus;

  @ApiPropertyOptional({
    example: 'asesor02',
    description: 'Filtrar por asesor asignado',
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  asesor?: string;

  @ApiPropertyOptional({
    example: 'cliente-001',
    description: 'Búsqueda parcial del cliente, insensible a mayúsculas',
  })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  cliente?: string;

  @ApiPropertyOptional({
    example: '2025-01-01T00:00:00.000Z',
    description: 'Fecha mínima de creación (ISO 8601)',
  })
  @IsOptional()
  @IsISO8601()
  @Transform(({ value }) => (value === '' ? undefined : value))
  desde?: string;

  @ApiPropertyOptional({
    example: '2025-01-31T23:59:59.999Z',
    description: 'Fecha máxima de creación (ISO 8601)',
  })
  @IsOptional()
  @IsISO8601()
  @Transform(({ value }) => (value === '' ? undefined : value))
  hasta?: string;

  @ApiPropertyOptional({
    type: Number,
    example: 1,
    minimum: 1,
    description: 'Número de página',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @ApiPropertyOptional({
    type: Number,
    example: 10,
    minimum: 1,
    maximum: 100,
    description: 'Elementos por página',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 10;

  @IsDateRangeValid({ message: 'La fecha "desde" no puede ser posterior a "hasta".' })
  _dateRangeCheck?: string;
}

/** Forma pública de una solicitud devuelta por la API. */
export class RequestResponseDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'cliente-001' })
  cliente: string;

  @ApiProperty({ example: 'Necesita revisión de la nueva campaña' })
  descripcion: string;

  @ApiProperty({ example: 'asesor-01', nullable: true })
  asesor: string | null;

  @ApiProperty({ enum: RequestStatus, example: RequestStatus.PENDIENTE })
  estado: RequestStatus;

  @ApiProperty({ example: '2025-01-01T00:00:00.000Z' })
  creadaEn: Date;

  @ApiProperty({ example: '2025-01-01T00:00:00.000Z' })
  actualizadaEn: Date;
}

/** Respuesta paginada para la colección de solicitudes. */
export class PageMetaDto {
  @ApiProperty({ example: 1 })
  page: number;

  @ApiProperty({ example: 10 })
  limit: number;

  @ApiProperty({ example: 42 })
  total: number;

  @ApiProperty({ example: 5 })
  totalPages: number;
}

export class PaginatedRequestsResponseDto {
  @ApiProperty({ type: [RequestResponseDto] })
  items: RequestResponseDto[];

  @ApiProperty({ type: PageMetaDto })
  pagination: PageMetaDto;
}

/** Registro de eventos del historial de una solicitud. */
export class RequestHistoryResponseDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 7 })
  solicitudId: number;

  @ApiProperty({ enum: RequestEventType, example: RequestEventType.ASIGNACION })
  tipoEvento: RequestEventType;

  @ApiProperty({ example: 'asesor01', nullable: true })
  valorAnterior: string | null;

  @ApiProperty({ example: 'asesor02' })
  valorNuevo: string;

  @ApiProperty({ example: 'supervisor1' })
  usuarioActor: string;

  @ApiProperty({ example: '2025-01-01T00:00:00.000Z' })
  fechaEvento: Date;
}
