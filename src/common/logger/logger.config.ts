import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'node:crypto';
import { Params } from 'nestjs-pino';
import { redactSensitive } from './redact';

const requestIdHeader = 'x-request-id';

export function createLoggerParams(config: ConfigService): Params {
  const isProduction =
    config.get<string>('app.environment', 'development') === 'production';

  return {
    pinoHttp: {
      level: config.get<string>('LOG_LEVEL', 'info'),
      quietReqLogger: true,
      genReqId(request, response) {
        const header = request.headers[requestIdHeader];
        const requestId =
          typeof header === 'string' && header.length <= 128
            ? header
            : randomUUID();

        response.setHeader(requestIdHeader, requestId);
        return requestId;
      },
      redact: {
        paths: [
          'req.headers.authorization',
          'req.headers.cookie',
          'res.headers["set-cookie"]',
        ],
        censor: '[REDACTED]',
      },
      hooks: {
        logMethod(args, method) {
          method.apply(
            this,
            args.map(redactSensitive) as Parameters<typeof method>,
          );
        },
      },
      transport: isProduction
        ? undefined
        : {
            target: 'pino-pretty',
            options: {
              colorize: true,
              singleLine: true,
              translateTime: 'SYS:standard',
              ignore: 'pid,hostname',
            },
          },
    },
  };
}
