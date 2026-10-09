import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { map, Observable } from 'rxjs';

/** Envuelve las respuestas exitosas con el formato común { success, data }. */
@Injectable()
export class ResponseInterceptor implements NestInterceptor {
  /** Transforma el valor retornado por el controlador antes de enviarlo. */
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      map((data) => ({
        success: true,
        data,
      })),
    );
  }
}
