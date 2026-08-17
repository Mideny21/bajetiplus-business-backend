import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  LoggerService,
} from '@nestjs/common';
import { Request, Response } from 'express';

type RequestLocals = { requestId?: string };

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  constructor(private readonly logger: LoggerService) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const response = http.getResponse<Response<unknown, RequestLocals>>();
    const request = http.getRequest<Request>();
    const isHttp = exception instanceof HttpException;
    const status = isHttp
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;
    const payload = isHttp ? exception.getResponse() : undefined;
    const rawMessage =
      typeof payload === 'object' && payload && 'message' in payload
        ? payload.message
        : isHttp
          ? exception.message
          : 'Internal server error';
    const message = Array.isArray(rawMessage)
      ? rawMessage.join(', ')
      : String(rawMessage);
    if (!isHttp || status >= 500) {
      this.logger.error(
        exception,
        exception instanceof Error ? exception.stack : undefined,
      );
    }
    response.status(status).json({
      success: false,
      statusCode: status,
      message:
        status >= 500 && process.env.NODE_ENV === 'production'
          ? 'Internal server error'
          : message,
      error: HttpStatus[status] ?? 'Error',
      path: request.originalUrl,
      timestamp: new Date().toISOString(),
      requestId:
        response.locals.requestId ?? request.header('x-request-id') ?? '',
    });
  }
}
