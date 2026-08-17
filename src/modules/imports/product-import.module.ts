import { Module } from '@nestjs/common';
import { BusinessesModule } from '../businesses/businesses.module';
import { InventoryModule } from '../inventory/inventory.module';
import { ProductImportController } from './product-import.controller';
import { ProductImportService } from './product-import.service';
@Module({
  imports: [BusinessesModule, InventoryModule],
  controllers: [ProductImportController],
  providers: [ProductImportService],
})
export class ProductImportModule {}
