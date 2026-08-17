import { mkdir, writeFile } from 'node:fs/promises';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { createSwaggerDocument } from './config/swagger';

async function generate(): Promise<void> {
  process.env.FIREBASE_CLIENT_EMAIL ||= 'openapi-generator@example.invalid';
  const { AppModule } = await import('./app.module');
  const app = await NestFactory.create(AppModule, {
    logger: false,
    abortOnError: false,
  });
  const config = app.get(ConfigService);
  app.setGlobalPrefix(config.get<string>('app.apiPrefix', 'api/v1'));
  const document = createSwaggerDocument(app);
  await mkdir('api', { recursive: true });
  await writeFile('api/openapi.json', `${JSON.stringify(document, null, 2)}\n`);
  await app.close();
}

void generate().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
