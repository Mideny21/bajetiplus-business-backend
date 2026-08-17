import { CallHandler, ExecutionContext } from '@nestjs/common';
import { firstValueFrom, of, throwError } from 'rxjs';
import { DevelopmentDelayInterceptor } from './development-delay.interceptor';

describe('DevelopmentDelayInterceptor', () => {
  afterEach(() => jest.useRealTimers());

  it('delays the response by the configured duration', async () => {
    jest.useFakeTimers();
    const interceptor = new DevelopmentDelayInterceptor(500);
    const next: CallHandler = { handle: () => of('response') };
    const result = firstValueFrom(
      interceptor.intercept({} as ExecutionContext, next),
    );
    let settled = false;
    void result.then(() => {
      settled = true;
    });

    jest.advanceTimersByTime(499);
    await Promise.resolve();
    expect(settled).toBe(false);

    jest.advanceTimersByTime(1);
    await expect(result).resolves.toBe('response');
  });

  it('delays error responses too', async () => {
    jest.useFakeTimers();
    const interceptor = new DevelopmentDelayInterceptor(500);
    const error = new Error('request failed');
    const next: CallHandler = { handle: () => throwError(() => error) };
    const result = firstValueFrom(
      interceptor.intercept({} as ExecutionContext, next),
    );
    let settled = false;
    void result.catch(() => {
      settled = true;
    });

    jest.advanceTimersByTime(499);
    await Promise.resolve();
    expect(settled).toBe(false);

    jest.advanceTimersByTime(1);
    await expect(result).rejects.toBe(error);
  });
});
