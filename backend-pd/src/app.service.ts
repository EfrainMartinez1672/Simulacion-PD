import { Injectable } from '@nestjs/common';

/** Contiene operaciones sencillas del endpoint raíz. */
@Injectable()
export class AppService {
  /** Devuelve el mensaje de disponibilidad de la API. */
  getHello(): string {
    return 'Hello World!';
  }
}
