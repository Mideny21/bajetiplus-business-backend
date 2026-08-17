import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, RedisClientType } from 'redis';

@Injectable()
export class CacheService implements OnModuleInit, OnModuleDestroy {
  private readonly client?: RedisClientType;

  constructor(config: ConfigService) {
    const redisUrl = config.get<string>('REDIS_URL');
    if (redisUrl) this.client = createClient({ url: redisUrl });
  }

  async onModuleInit(): Promise<void> {
    await this.client?.connect();
  }
  async onModuleDestroy(): Promise<void> {
    if (this.client?.isOpen) await this.client.quit();
  }
  async get<T>(key: string): Promise<T | null> {
    if (!this.client) return null;
    const value = await this.client.get(key);
    return value === null ? null : (JSON.parse(value) as T);
  }
  async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    if (!this.client) return;
    const options = ttlSeconds ? { EX: ttlSeconds } : undefined;
    await this.client.set(key, JSON.stringify(value), options);
  }
  async delete(key: string): Promise<void> {
    if (!this.client) return;
    await this.client.del(key);
  }
  async ping(): Promise<string> {
    return this.client ? this.client.ping() : 'disabled';
  }
}
