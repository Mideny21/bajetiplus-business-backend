import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CacheService } from '../cache/cache.service';
import { DatabaseService } from '../../database/database.service';

@Controller('health')
@ApiTags('Health')
export class HealthController {
  constructor(
    private readonly database: DatabaseService,
    private readonly cache: CacheService,
  ) {}

  @Get('live')
  liveness(): { status: string } {
    return { status: 'ok' };
  }

  @Get('ready')
  async readiness(): Promise<{
    status: string;
    database: string;
    redis: string;
  }> {
    try {
      await Promise.all([this.database.$queryRaw`SELECT 1`, this.cache.ping()]);
      return { status: 'ready', database: 'up', redis: 'up' };
    } catch {
      throw new ServiceUnavailableException(
        'Required infrastructure is unavailable',
      );
    }
  }
}
