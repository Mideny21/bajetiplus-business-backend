import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { BusinessesService } from '../businesses/businesses.service';
import {
  CreateExpenseCategoryDto,
  CreateExpenseDto,
  UpdateExpenseCategoryDto,
} from './dto/expense.dto';
@Injectable()
export class ExpensesService {
  constructor(
    private readonly database: DatabaseService,
    private readonly businesses: BusinessesService,
  ) {}
  async createCategory(
    userId: string,
    businessId: string,
    dto: CreateExpenseCategoryDto,
  ) {
    await this.businesses.getOwned(userId, businessId);
    return this.database.expenseCategory.create({
      data: { businessId, name: dto.name.trim() },
    });
  }
  async categories(
    userId: string,
    businessId: string,
    includeArchived = false,
  ) {
    await this.businesses.getOwned(userId, businessId);
    return this.database.expenseCategory.findMany({
      where: { businessId, ...(includeArchived ? {} : { isActive: true }) },
      orderBy: { name: 'asc' },
    });
  }
  async requireCategory(userId: string, businessId: string, id: string) {
    await this.businesses.getOwned(userId, businessId);
    const value = await this.database.expenseCategory.findFirst({
      where: { id, businessId },
    });
    if (!value) throw new NotFoundException('Expense category not found');
    return value;
  }
  async updateCategory(
    userId: string,
    businessId: string,
    id: string,
    dto: UpdateExpenseCategoryDto,
  ) {
    await this.requireCategory(userId, businessId, id);
    return this.database.expenseCategory.update({
      where: { id },
      data: { ...dto, name: dto.name?.trim() },
    });
  }
  async archiveCategory(userId: string, businessId: string, id: string) {
    await this.requireCategory(userId, businessId, id);
    return this.database.expenseCategory.update({
      where: { id },
      data: { isActive: false },
    });
  }
  async create(userId: string, businessId: string, dto: CreateExpenseDto) {
    const branch = await this.businesses.getMainBranch(userId, businessId);
    if (dto.branchId && dto.branchId !== branch.id)
      throw new BadRequestException('V1 expenses must use the Main Branch');
    const category = await this.requireCategory(
      userId,
      businessId,
      dto.categoryId,
    );
    if (!category.isActive)
      throw new BadRequestException('Expense category is archived');
    return this.database.expense.create({
      data: {
        businessId,
        branchId: branch.id,
        categoryId: category.id,
        amount: dto.amount,
        description: dto.description,
        incurredAt: dto.date ? new Date(dto.date) : undefined,
      },
      include: { category: true, branch: true },
    });
  }
  async list(userId: string, businessId: string) {
    await this.businesses.getOwned(userId, businessId);
    return this.database.expense.findMany({
      where: { businessId },
      include: { category: true },
      orderBy: { incurredAt: 'desc' },
    });
  }
}
