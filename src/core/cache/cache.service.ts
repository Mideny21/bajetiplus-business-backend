import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, RedisClientType } from 'redis';

@Injectable()
export class CacheService implements OnModuleInit, OnModuleDestroy {
  private readonly client: RedisClientType;

  constructor(config: ConfigService) {
    this.client = createClient({ url: config.getOrThrow<string>('REDIS_URL') });
  }

  async onModuleInit(): Promise<void> {
    await this.client.connect();
  }
  async onModuleDestroy(): Promise<void> {
    if (this.client.isOpen) await this.client.quit();
  }
  async get<T>(key: string): Promise<T | null> {
    const value = await this.client.get(key);
    return value === null ? null : (JSON.parse(value) as T);
  }
  async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    const options = ttlSeconds ? { EX: ttlSeconds } : undefined;
    await this.client.set(key, JSON.stringify(value), options);
  }
  async delete(key: string): Promise<void> {
    await this.client.del(key);
  }
  async ping(): Promise<string> {
    return this.client.ping();
  }
}
