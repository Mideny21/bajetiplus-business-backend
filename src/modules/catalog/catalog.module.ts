import { Module } from '@nestjs/common';
import { BusinessesModule } from '../businesses/businesses.module';
import { CatalogController } from './catalog.controller';
import { CatalogService } from './catalog.service';
@Module({
  imports: [BusinessesModule],
  controllers: [CatalogController],
  providers: [CatalogService],
  exports: [CatalogService],
})
export class CatalogModule {}
