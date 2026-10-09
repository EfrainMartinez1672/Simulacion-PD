import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { UsersService } from '../../modules/users/users.service';

/** Resuelve la identidad del encabezado x-user y la añade a la petición HTTP. */
@Injectable()
export class UserGuard implements CanActivate {
  constructor(private readonly usersService: UsersService) {}

  /** Rechaza usuarios ausentes o no registrados en el catálogo de prueba. */
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const path = request.originalUrl || request.url || '';

    if (path === '/' || path.startsWith('/api/docs')) {
      return true;
    }

    const userId = request.headers['x-user'];

    if (!userId) {
      throw new UnauthorizedException('Missing x-user header');
    }

    const user = this.usersService.findById(String(userId));

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    request.user = user;
    return true;
  }
}
