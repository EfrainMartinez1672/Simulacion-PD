import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/** Valida el encabezado x-api-key contra las claves configuradas en API_KEYS. */
@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(private readonly configService: ConfigService) {}

  /** Permite Swagger y la ruta raíz; exige una clave válida para la API. */
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const path = request.originalUrl || request.url || '';

    if (path === '/' || path.startsWith('/api/docs')) {
      return true;
    }

    const providedApiKey = request.headers['x-api-key'];
    const validKeys = (this.configService.get<string>('API_KEYS') ?? '')
      .split(',')
      .map((key) => key.trim())
      .filter(Boolean);

    if (!validKeys.length || !providedApiKey) {
      throw new UnauthorizedException('Missing or invalid API key');
    }

    if (!validKeys.includes(String(providedApiKey))) {
      throw new UnauthorizedException('Invalid API key');
    }

    return true;
  }
}
