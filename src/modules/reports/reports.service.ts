import { BadRequestException, Injectable } from '@nestjs/common';
import { CatalogItemType, Prisma } from '@prisma/client';
import { DatabaseService } from '../../database/database.service';
import { BusinessesService } from '../businesses/businesses.service';
import { ReportPeriod, ReportQueryDto } from './dto/report-query.dto';
@Injectable()
export class ReportsService {
  constructor(
    private readonly database: DatabaseService,
    private readonly businesses: BusinessesService,
  ) {}
  async dashboard(userId: string, businessId: string, query: ReportQueryDto) {
    await this.businesses.getOwned(userId, businessId);
    const range = this.range(query);
    const dateWhere = { gte: range.from, lt: range.to };
    const [sales, expenses, saleItems, balances, products] = await Promise.all([
      this.database.sale.aggregate({
        where: { businessId, soldAt: dateWhere },
        _sum: { total: true, discount: true },
        _count: true,
      }),
      this.database.expense.aggregate({
        where: { businessId, incurredAt: dateWhere },
        _sum: { amount: true },
      }),
      this.database.saleItem.findMany({
        where: { sale: { businessId, soldAt: dateWhere } },
        select: {
          catalogItemId: true,
          itemName: true,
          quantity: true,
          total: true,
          unitCostSnapshot: true,
          itemType: true,
        },
      }),
      this.database.inventoryBalance.findMany({
        where: { businessId },
        include: { catalogItem: true, variant: true },
      }),
      this.database.catalogItem.findMany({
        where: {
          businessId,
          type: CatalogItemType.PRODUCT,
          trackStock: true,
          isActive: true,
        },
        include: { variants: { where: { isActive: true } } },
      }),
    ]);
    const itemMargin = saleItems.reduce(
      (sum, item) =>
        sum
          .plus(item.total)
          .minus(
            (item.unitCostSnapshot ?? new Prisma.Decimal(0)).mul(item.quantity),
          ),
      new Prisma.Decimal(0),
    );
    const grossProfit = itemMargin.minus(sales._sum.discount ?? 0);
    const topMap = new Map<
      string,
      {
        catalogItemId: string;
        name: string;
        quantity: Prisma.Decimal;
        sales: Prisma.Decimal;
      }
    >();
    for (const item of saleItems) {
      if (item.itemType !== CatalogItemType.PRODUCT) continue;
      const current = topMap.get(item.catalogItemId) ?? {
        catalogItemId: item.catalogItemId,
        name: item.itemName,
        quantity: new Prisma.Decimal(0),
        sales: new Prisma.Decimal(0),
      };
      current.quantity = current.quantity.plus(item.quantity);
      current.sales = current.sales.plus(item.total);
      topMap.set(item.catalogItemId, current);
    }
    const stockValue = balances.reduce(
      (sum, balance) =>
        sum.plus(
          balance.quantity.mul(
            balance.variant?.costPrice ?? balance.catalogItem.costPrice ?? 0,
          ),
        ),
      new Prisma.Decimal(0),
    );
    const stockByKey = new Map(
      balances.map((balance) => [
        `${balance.catalogItemId}:${balance.variantId ?? 'BASE'}`,
        balance.quantity,
      ]),
    );
    const lowStockProducts = products.flatMap((product) => {
      const stockTargets = product.variants.length
        ? product.variants.map((variant) => ({
            variantId: variant.id,
            variantName: variant.name,
            threshold: variant.lowStockThreshold ?? product.lowStockThreshold,
          }))
        : [
            {
              variantId: null,
              variantName: null,
              threshold: product.lowStockThreshold,
            },
          ];
      return stockTargets.flatMap((target) => {
        const quantity =
          stockByKey.get(`${product.id}:${target.variantId ?? 'BASE'}`) ??
          new Prisma.Decimal(0);
        return target.threshold !== null &&
          quantity.lessThanOrEqualTo(target.threshold)
          ? [
              {
                catalogItemId: product.id,
                name: product.name,
                variantId: target.variantId,
                variantName: target.variantName,
                quantity,
                lowStockThreshold: target.threshold,
              },
            ]
          : [];
      });
    });
    return {
      period: range,
      totalSales: sales._sum.total ?? new Prisma.Decimal(0),
      totalExpenses: expenses._sum.amount ?? new Prisma.Decimal(0),
      estimatedGrossProfit: grossProfit,
      numberOfSales: sales._count,
      stockValue,
      topSellingProducts: [...topMap.values()]
        .sort((a, b) => b.quantity.comparedTo(a.quantity))
        .slice(0, 10),
      lowStockProducts,
    };
  }
  private range(query: ReportQueryDto) {
    const period = query.period ?? ReportPeriod.MONTH;
    const now = new Date();
    let from: Date;
    let to: Date;
    if (period === ReportPeriod.CUSTOM) {
      if (!query.from || !query.to)
        throw new BadRequestException(
          'Custom period requires from and to dates',
        );
      from = new Date(query.from);
      to = new Date(query.to);
      to.setDate(to.getDate() + 1);
    } else {
      to = new Date(now);
      to.setHours(24, 0, 0, 0);
      from = new Date(now);
      from.setHours(0, 0, 0, 0);
      if (period === ReportPeriod.WEEK) {
        const day = from.getDay() || 7;
        from.setDate(from.getDate() - day + 1);
      }
      if (period === ReportPeriod.MONTH) from.setDate(1);
    }
    if (from >= to) throw new BadRequestException('from must be before to');
    return { type: period, from, to };
  }
}
