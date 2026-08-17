import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseBoolPipe,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AuthUser } from '../../common/types/auth-user.type';
import {
  CreateExpenseCategoryDto,
  CreateExpenseDto,
  UpdateExpenseCategoryDto,
} from './dto/expense.dto';
import { ExpensesService } from './expenses.service';
@Controller('businesses/:businessId')
@UseGuards(JwtAuthGuard)
@ApiTags('Expenses')
@ApiBearerAuth('bearer')
export class ExpensesController {
  constructor(private readonly expenses: ExpensesService) {}
  @Post('expense-categories') createCategory(
    @CurrentUser() u: AuthUser,
    @Param('businessId', ParseUUIDPipe) b: string,
    @Body() d: CreateExpenseCategoryDto,
  ) {
    return this.expenses.createCategory(u.id, b, d);
  }
  @Get('expense-categories') categories(
    @CurrentUser() u: AuthUser,
    @Param('businessId', ParseUUIDPipe) b: string,
    @Query('includeArchived', new ParseBoolPipe({ optional: true }))
    a?: boolean,
  ) {
    return this.expenses.categories(u.id, b, a);
  }
  @Patch('expense-categories/:id') updateCategory(
    @CurrentUser() u: AuthUser,
    @Param('businessId', ParseUUIDPipe) b: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() d: UpdateExpenseCategoryDto,
  ) {
    return this.expenses.updateCategory(u.id, b, id, d);
  }
  @Delete('expense-categories/:id') archiveCategory(
    @CurrentUser() u: AuthUser,
    @Param('businessId', ParseUUIDPipe) b: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.expenses.archiveCategory(u.id, b, id);
  }
  @Post('expenses') create(
    @CurrentUser() u: AuthUser,
    @Param('businessId', ParseUUIDPipe) b: string,
    @Body() d: CreateExpenseDto,
  ) {
    return this.expenses.create(u.id, b, d);
  }
  @Get('expenses') list(
    @CurrentUser() u: AuthUser,
    @Param('businessId', ParseUUIDPipe) b: string,
  ) {
    return this.expenses.list(u.id, b);
  }
}
