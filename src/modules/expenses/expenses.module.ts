import { Module } from '@nestjs/common';
import { BusinessesModule } from '../businesses/businesses.module';
import { ExpensesController } from './expenses.controller';
import { ExpensesService } from './expenses.service';
@Module({
  imports: [BusinessesModule],
  controllers: [ExpensesController],
  providers: [ExpensesService],
})
export class ExpensesModule {}
