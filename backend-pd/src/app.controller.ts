import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';

/** Expone endpoints generales de la aplicación, independientes de solicitudes. */
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  /** Comprueba que la API está disponible. */
  @Get()
  getHello(): string {
    return this.appService.getHello();
  }
}
