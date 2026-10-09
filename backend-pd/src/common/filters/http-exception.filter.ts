import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';

/** Convierte excepciones HTTP y errores inesperados a un formato uniforme. */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  /** Envía el código HTTP y un cuerpo de error JSON normalizado. */
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const errorResponse =
      exception instanceof HttpException
        ? exception.getResponse()
        : { message: 'Internal server error' };

    response.status(status).json({
      success: false,
      statusCode: status,
      message:
        typeof errorResponse === 'string'
          ? errorResponse
          : ((errorResponse as any).message ?? 'Error'),
      error:
        typeof errorResponse === 'string'
          ? undefined
          : (errorResponse as any).error,
    });
  }
}
