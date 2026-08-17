import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { Observable } from 'rxjs';
import { Request, Response } from 'express';

type RequestLocals = { requestId?: string };
type RequestWithId = Request & { id?: string };

@Injectable()
export class RequestIdInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<RequestWithId>();
    const response = context
      .switchToHttp()
      .getResponse<Response<unknown, RequestLocals>>();
    const incoming = request.id ?? request.header('x-request-id');
    const requestId =
      incoming && incoming.length <= 128 ? incoming : randomUUID();
    response.setHeader('x-request-id', requestId);
    response.locals.requestId = requestId;
    return next.handle();
  }
}
