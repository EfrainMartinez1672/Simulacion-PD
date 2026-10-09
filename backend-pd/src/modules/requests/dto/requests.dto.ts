import { ApiProperty } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsEnum, IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { RequestStatus } from '../enums/request-status.enum';

/** Campos admitidos para crear solicitudes; no permite definir estado desde el cliente. */
export class CreateRequestDto {
  @ApiProperty({
    example: 'cliente-001',
    description: 'Identificador del cliente',
  })
  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => String(value).trim())
  cliente: string;

  @ApiProperty({
    example: 'Necesita revisión de la nueva campaña',
    description: 'Descripción de la solicitud',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(1040)
  @Transform(({ value }) => String(value).trim())
  descripcion: string;

  @ApiProperty({
    example: 'advisor1',
    description: 'ID del usuario asesor asignado (x-user)',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(240)
  @Transform(({ value }) => String(value).trim())
  asesor: string;
}

/** Cuerpo permitido para cambiar el estado de una solicitud existente. */
export class UpdateRequestStatusDto {
  @ApiProperty({ enum: RequestStatus, description: 'Nuevo estado' })
  @IsEnum(RequestStatus)
  @Type(() => String)
  estado: RequestStatus;
}

/** Forma pública de una solicitud devuelta por la API. */
export class RequestResponseDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'cliente-001' })
  cliente: string;

  @ApiProperty({ example: 'Necesita revisión de la nueva campaña' })
  descripcion: string;

  @ApiProperty({ example: 'asesor-01' })
  asesor: string;

  @ApiProperty({ enum: RequestStatus, example: RequestStatus.PENDIENTE })
  estado: RequestStatus;

  @ApiProperty({ example: '2025-01-01T00:00:00.000Z' })
  creadaEn: Date;

  @ApiProperty({ example: '2025-01-01T00:00:00.000Z' })
  actualizadaEn: Date;
}
