import { Module } from '@nestjs/common';
import { BusinessesModule } from '../businesses/businesses.module';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';
@Module({
  imports: [BusinessesModule],
  controllers: [ReportsController],
  providers: [ReportsService],
})
export class ReportsModule {}
