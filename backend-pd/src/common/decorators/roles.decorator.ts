import { SetMetadata } from '@nestjs/common';
import { Role } from '../../modules/users/enums/role.enum';

/** Clave interna de metadatos utilizada por RolesGuard. */
export const ROLES_KEY = 'roles';

/** Declara los roles que pueden ejecutar un controlador o endpoint. */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
