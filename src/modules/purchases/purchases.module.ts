import { Module } from '@nestjs/common';
import { BusinessesModule } from '../businesses/businesses.module';
import { InventoryModule } from '../inventory/inventory.module';
import { PurchasesController } from './purchases.controller';
import { PurchasesService } from './purchases.service';
@Module({
  imports: [BusinessesModule, InventoryModule],
  controllers: [PurchasesController],
  providers: [PurchasesService],
})
export class PurchasesModule {}
