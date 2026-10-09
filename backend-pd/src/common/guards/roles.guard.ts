import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '../../modules/users/enums/role.enum';
import { ROLES_KEY } from '../decorators/roles.decorator';

/** Comprueba que el usuario autenticado tenga uno de los roles requeridos. */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  /** Lee los roles declarados con @Roles y deniega el acceso si no coinciden. */
  canActivate(context: ExecutionContext): boolean {
    const requiredRoles =
      this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) ?? [];

    if (!requiredRoles.length) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || !requiredRoles.includes(user.role)) {
      throw new ForbiddenException('Insufficient privileges');
    }

    return true;
  }
}
