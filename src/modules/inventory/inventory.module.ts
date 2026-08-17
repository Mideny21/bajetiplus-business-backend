import { Module } from '@nestjs/common';
import { BusinessesModule } from '../businesses/businesses.module';
import { CatalogModule } from '../catalog/catalog.module';
import { InventoryController } from './inventory.controller';
import { InventoryService } from './inventory.service';
@Module({
  imports: [BusinessesModule, CatalogModule],
  controllers: [InventoryController],
  providers: [InventoryService],
  exports: [InventoryService],
})
export class InventoryModule {}
