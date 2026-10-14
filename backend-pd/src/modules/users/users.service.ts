import { Injectable } from '@nestjs/common';
import { Role } from './enums/role.enum';
import { AppUser } from './interfaces/app-user.interface';

/** Catálogo en memoria de identidades y roles usados por los guards. */
@Injectable()
export class UsersService {
  private readonly users: Record<string, AppUser> = {
    admin1: { id: 'admin1', role: Role.ADMIN },
    supervisor1: { id: 'supervisor1', role: Role.SUPERVISOR },
    asesor01: {
      id: 'asesor01',
      role: Role.ASESOR,
      assignmentAliases: ['advisor1'],
    },
    asesor02: {
      id: 'asesor02',
      role: Role.ASESOR,
      assignmentAliases: ['advisor2'],
    },
    advisor1: {
      id: 'advisor1',
      role: Role.ASESOR,
      assignmentAliases: ['asesor-01'],
    },
    advisor2: {
      id: 'advisor2',
      role: Role.ASESOR,
      assignmentAliases: ['asesor-02'],
    },
  };

  /** Busca una identidad por el valor recibido en el encabezado x-user. */
  findById(id: string): AppUser | undefined {
    return this.users[id];
  }

  /** Indica si una identidad existe en el catálogo configurado. */
  exists(id: string): boolean {
    return Boolean(this.users[id]);
  }

  /** Permite validar si el usuario objetivo es un asesor válido. */
  findAssessorById(id: string): AppUser | undefined {
    const user = this.users[id];
    return user && user.role === Role.ASESOR ? user : undefined;
  }
}
