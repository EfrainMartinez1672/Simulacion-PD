import { Injectable } from '@nestjs/common';
import { Role } from './enums/role.enum';
import { AppUser } from './interfaces/app-user.interface';

/** Catálogo en memoria de identidades y roles usados por los guards. */
@Injectable()
export class UsersService {
  private readonly users: Record<string, AppUser> = {
    admin1: { id: 'admin1', role: Role.ADMIN },
    supervisor1: { id: 'supervisor1', role: Role.SUPERVISOR },
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
}
