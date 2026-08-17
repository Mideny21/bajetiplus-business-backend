import { plainToInstance, Transform, Type } from 'class-transformer';
import {
  IsEmail,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  Min,
  MinLength,
  validateSync,
} from 'class-validator';

export enum Environment {
  Development = 'development',
  Test = 'test',
  Production = 'production',
}

export class EnvironmentVariables {
  @IsEnum(Environment)
  NODE_ENV: Environment = Environment.Development;

  @IsString()
  APP_NAME = 'nestjs-backend-starter';

  @Type(() => Number)
  @IsInt()
  @Min(1)
  PORT = 3000;

  @IsString()
  API_PREFIX = 'api/v1';

  @Type(() => Number)
  @IsInt()
  @Min(0)
  TRUST_PROXY = 0;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  DEV_RESPONSE_DELAY_MS = 500;

  @IsString()
  CORS_ORIGINS = 'http://localhost:3000';

  @IsUrl({ require_tld: false, protocols: ['postgresql', 'postgres'] })
  DATABASE_URL!: string;

  @IsUrl({ require_tld: false, protocols: ['redis', 'rediss'] })
  REDIS_URL!: string;

  @IsString()
  @MinLength(32)
  JWT_ACCESS_SECRET!: string;

  @IsString()
  JWT_ACCESS_EXPIRES_IN = '15m';

  @IsString()
  @MinLength(32)
  JWT_REFRESH_SECRET!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  JWT_REFRESH_EXPIRES_IN_DAYS = 30;

  @Type(() => Number)
  @IsInt()
  @Min(1000)
  THROTTLE_TTL_MS = 60_000;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  THROTTLE_LIMIT = 100;

  @IsString()
  PHONE_DEFAULT_COUNTRY_CODE = '255';

  @IsString()
  LOG_LEVEL = 'info';

  @IsOptional()
  @IsString()
  FIREBASE_PROJECT_ID?: string;

  @IsOptional()
  @IsEmail()
  FIREBASE_CLIENT_EMAIL?: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.replace(/\\n/g, '\n') : value,
  )
  FIREBASE_PRIVATE_KEY?: string;
}

export function validateEnvironment(
  config: Record<string, unknown>,
): EnvironmentVariables {
  const validated = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });
  const errors = validateSync(validated, { skipMissingProperties: false });
  if (errors.length > 0) {
    throw new Error(`Invalid environment configuration: ${errors.toString()}`);
  }
  return validated;
}
