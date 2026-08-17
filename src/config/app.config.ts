import { registerAs } from '@nestjs/config';

export default registerAs('app', () => ({
  name: process.env.APP_NAME ?? 'nestjs-backend-starter',
  environment: process.env.NODE_ENV ?? 'development',
  port: Number(process.env.PORT ?? 3000),
  apiPrefix: process.env.API_PREFIX ?? 'api/v1',
  trustProxy: Number(process.env.TRUST_PROXY ?? 0),
  developmentResponseDelayMs: Number(process.env.DEV_RESPONSE_DELAY_MS ?? 500),
  corsOrigins: (process.env.CORS_ORIGINS ?? 'http://localhost:3000')
    .split(',')
    .map((origin) => origin.trim()),
  redisUrl: process.env.REDIS_URL,
  phoneCountryCode: process.env.PHONE_DEFAULT_COUNTRY_CODE ?? '255',
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET,
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN ?? '15m',
    refreshSecret: process.env.JWT_REFRESH_SECRET,
    refreshExpiresInDays: Number(process.env.JWT_REFRESH_EXPIRES_IN_DAYS ?? 30),
  },
}));
