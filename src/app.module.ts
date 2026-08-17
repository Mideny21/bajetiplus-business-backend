import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { LoggerModule } from 'nestjs-pino';
import appConfig from './config/app.config';
import { validateEnvironment } from './config/env.validation';
import { createLoggerParams } from './common/logger/logger.config';
import { DatabaseModule } from './database/database.module';
import { CacheModule } from './core/cache/cache.module';
import { FirebaseModule } from './core/firebase/firebase.module';
import { HealthModule } from './core/health/health.module';
import { AuthModule } from './modules/auth/auth.module';
import { BusinessesModule } from './modules/businesses/businesses.module';
import { CatalogModule } from './modules/catalog/catalog.module';
import { ContactsModule } from './modules/contacts/contacts.module';
import { ExpensesModule } from './modules/expenses/expenses.module';
import { ProductImportModule } from './modules/imports/product-import.module';
import { InventoryModule } from './modules/inventory/inventory.module';
import { PurchasesModule } from './modules/purchases/purchases.module';
import { ReportsModule } from './modules/reports/reports.module';
import { SalesModule } from './modules/sales/sales.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig],
      validate: validateEnvironment,
    }),
    LoggerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: createLoggerParams,
    }),
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => [
        {
          ttl: config.get<number>('THROTTLE_TTL_MS', 60_000),
          limit: config.get<number>('THROTTLE_LIMIT', 100),
        },
      ],
    }),
    DatabaseModule,
    CacheModule,
    FirebaseModule,
    HealthModule,
    AuthModule,
    BusinessesModule,
    CatalogModule,
    InventoryModule,
    ContactsModule,
    SalesModule,
    PurchasesModule,
    ExpensesModule,
    ReportsModule,
    ProductImportModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
