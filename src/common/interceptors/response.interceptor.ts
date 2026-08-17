import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { map, Observable } from 'rxjs';

type RequestLocals = { requestId?: string };

export interface SuccessResponse<T> {
  success: true;
  statusCode: number;
  message: string;
  data: T;
  timestamp: string;
  requestId: string;
}

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<
  T,
  SuccessResponse<T>
> {
  intercept(
    context: ExecutionContext,
    next: CallHandler<T>,
  ): Observable<SuccessResponse<T>> {
    const http = context.switchToHttp();
    const request = http.getRequest<Request>();
    const response = http.getResponse<Response<unknown, RequestLocals>>();
    return next.handle().pipe(
      map((body) => ({
        success: true,
        statusCode: response.statusCode,
        message: response.statusMessage || 'Success',
        data: body,
        timestamp: new Date().toISOString(),
        requestId:
          response.locals.requestId ?? request.header('x-request-id') ?? '',
      })),
    );
  }
}
