import { Role } from '../enums/role.enum';

/** Identidad asociada a una petición después de validar x-user. */
export interface AppUser {
  id: string;
  role: Role;
  /** Identificadores heredados que ya pueden figurar en asignaciones guardadas. */
  assignmentAliases?: string[];
}
