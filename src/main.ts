import { NestInterceptor, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import helmet from 'helmet';
import { Logger } from 'nestjs-pino';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/filters/http-exception.filter';
import { DevelopmentDelayInterceptor } from './common/interceptors/development-delay.interceptor';
import { RequestIdInterceptor } from './common/interceptors/request-id.interceptor';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { setupSwagger } from './config/swagger';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: true,
  });
  const logger = app.get(Logger);
  app.useLogger(logger);
  const config = app.get(ConfigService);
  app.set('trust proxy', config.get<number>('app.trustProxy', 0));
  app.setGlobalPrefix(config.get<string>('app.apiPrefix', 'api/v1'));
  setupSwagger(app);
  app.use(helmet());
  app.enableCors({
    origin: config.get<string[]>('app.corsOrigins', []),
    credentials: true,
  });
  app.enableShutdownHooks();
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  const globalInterceptors: NestInterceptor[] = [new RequestIdInterceptor()];
  if (config.get<string>('app.environment') === 'development') {
    const delayMs = config.get<number>('app.developmentResponseDelayMs', 2000);
    if (delayMs > 0) {
      globalInterceptors.push(new DevelopmentDelayInterceptor(delayMs));
    }
  }
  globalInterceptors.push(new ResponseInterceptor());
  app.useGlobalInterceptors(...globalInterceptors);
  app.useGlobalFilters(new GlobalExceptionFilter(logger));
  const port = config.get<number>('app.port', 3000);
  await app.listen(port);
  logger.log(`Listening on port ${port}`, 'Bootstrap');
}

void bootstrap();
