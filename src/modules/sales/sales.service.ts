import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  CatalogItemType,
  InventoryMovementType,
  PaymentMethod,
  Prisma,
} from '@prisma/client';
import { DatabaseService } from '../../database/database.service';
import { BusinessesService } from '../businesses/businesses.service';
import { InventoryService } from '../inventory/inventory.service';
import { CreateSaleDto } from './dto/sale.dto';

@Injectable()
export class SalesService {
  constructor(
    private readonly database: DatabaseService,
    private readonly businesses: BusinessesService,
    private readonly inventory: InventoryService,
  ) {}
  async create(userId: string, businessId: string, dto: CreateSaleDto) {
    const branch = await this.businesses.getMainBranch(userId, businessId);
    if (dto.branchId && dto.branchId !== branch.id)
      throw new BadRequestException('V1 sales must use the Main Branch');
    const customer = dto.customerId
      ? await this.database.customer.findFirst({
          where: { id: dto.customerId, businessId, isActive: true },
        })
      : null;
    if (dto.customerId && !customer)
      throw new NotFoundException('Customer not found');
    if (dto.paymentMethod === PaymentMethod.CREDIT && !customer)
      throw new BadRequestException('Credit sales require a customer');
    const lines = await Promise.all(
      dto.items.map(async (line) => {
        const item = await this.database.catalogItem.findFirst({
          where: { id: line.catalogItemId, businessId, isActive: true },
          include: { variants: { where: { isActive: true } } },
        });
        if (!item)
          throw new NotFoundException(
            `Catalog item ${line.catalogItemId} not found`,
          );
        const variant = line.variantId
          ? item.variants.find((value) => value.id === line.variantId)
          : undefined;
        if (line.variantId && !variant)
          throw new BadRequestException(
            `Variant does not belong to ${item.name}`,
          );
        if (
          item.type === CatalogItemType.PRODUCT &&
          item.variants.length &&
          !variant
        )
          throw new BadRequestException(
            `A variant is required for ${item.name}`,
          );
        if (!item.variants.length && variant)
          throw new BadRequestException(`${item.name} has no variants`);
        if (item.type === CatalogItemType.SERVICE && variant)
          throw new BadRequestException('Services cannot have variants');
        const unitPrice = new Prisma.Decimal(
          line.unitPrice ?? variant?.sellingPrice ?? item.sellingPrice,
        );
        const quantity = new Prisma.Decimal(line.quantity);
        const discount = new Prisma.Decimal(line.discount ?? 0);
        const gross = unitPrice.mul(quantity);
        if (discount.greaterThan(gross))
          throw new BadRequestException(
            `Discount exceeds line total for ${item.name}`,
          );
        return {
          item,
          variant,
          quantity,
          unitPrice,
          discount,
          total: gross.minus(discount),
        };
      }),
    );
    const subtotal = lines.reduce(
      (sum, line) => sum.plus(line.total),
      new Prisma.Decimal(0),
    );
    const discount = new Prisma.Decimal(dto.discount ?? 0);
    if (discount.greaterThan(subtotal))
      throw new BadRequestException('Sale discount exceeds subtotal');
    const total = subtotal.minus(discount);
    return this.database.$transaction(
      async (tx) => {
        const sale = await tx.sale.create({
          data: {
            businessId,
            branchId: branch.id,
            customerId: customer?.id,
            paymentMethod: dto.paymentMethod,
            subtotal,
            discount,
            total,
            soldAt: dto.date ? new Date(dto.date) : undefined,
            items: {
              create: lines.map((line) => ({
                catalogItemId: line.item.id,
                variantId: line.variant?.id,
                itemName: line.item.name,
                variantSnapshot: line.variant?.attributes ?? undefined,
                itemType: line.item.type,
                quantity: line.quantity,
                unitPrice: line.unitPrice,
                discount: line.discount,
                total: line.total,
                unitCostSnapshot:
                  line.variant?.costPrice ?? line.item.costPrice,
              })),
            },
          },
          include: { items: true, customer: true, branch: true },
        });
        for (const line of lines) {
          if (
            line.item.type === CatalogItemType.PRODUCT &&
            line.item.trackStock
          ) {
            await this.inventory.changeStock(tx, {
              businessId,
              branchId: branch.id,
              catalogItemId: line.item.id,
              variantId: line.variant?.id,
              quantity: line.quantity.negated(),
              type: InventoryMovementType.SALE,
              referenceType: 'SALE',
              referenceId: sale.id,
              occurredAt: sale.soldAt,
            });
          }
        }
        if (customer && dto.paymentMethod === PaymentMethod.CREDIT)
          await tx.customer.update({
            where: { id: customer.id },
            data: { balance: { increment: total } },
          });
        return sale;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }
  async list(userId: string, businessId: string) {
    await this.businesses.getOwned(userId, businessId);
    return this.database.sale.findMany({
      where: { businessId },
      include: { customer: true, items: true },
      orderBy: { soldAt: 'desc' },
    });
  }
  async get(userId: string, businessId: string, id: string) {
    await this.businesses.getOwned(userId, businessId);
    const sale = await this.database.sale.findFirst({
      where: { id, businessId },
      include: { customer: true, branch: true, items: true },
    });
    if (!sale) throw new NotFoundException('Sale not found');
    return sale;
  }
}
