import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { delay, dematerialize, materialize, Observable } from 'rxjs';

@Injectable()
export class DevelopmentDelayInterceptor implements NestInterceptor {
  constructor(private readonly delayMs: number) {}

  intercept(
    _context: ExecutionContext,
    next: CallHandler,
  ): Observable<unknown> {
    return next
      .handle()
      .pipe(materialize(), delay(this.delayMs), dematerialize());
  }
}
