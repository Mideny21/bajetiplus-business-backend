import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CatalogItemType, InventoryMovementType, Prisma } from '@prisma/client';
import { DatabaseService } from '../../database/database.service';
import { BusinessesService } from '../businesses/businesses.service';
import { InventoryService } from '../inventory/inventory.service';
import { CreatePurchaseDto } from './dto/purchase.dto';
@Injectable()
export class PurchasesService {
  constructor(
    private readonly database: DatabaseService,
    private readonly businesses: BusinessesService,
    private readonly inventory: InventoryService,
  ) {}
  async create(userId: string, businessId: string, dto: CreatePurchaseDto) {
    const branch = await this.businesses.getMainBranch(userId, businessId);
    if (dto.branchId && dto.branchId !== branch.id)
      throw new BadRequestException('V1 purchases must use the Main Branch');
    const supplier = await this.database.supplier.findFirst({
      where: { id: dto.supplierId, businessId, isActive: true },
    });
    if (!supplier) throw new NotFoundException('Supplier not found');
    const lines = await Promise.all(
      dto.items.map(async (line) => {
        const item = await this.database.catalogItem.findFirst({
          where: {
            id: line.catalogItemId,
            businessId,
            isActive: true,
            type: CatalogItemType.PRODUCT,
          },
          include: { variants: { where: { isActive: true } } },
        });
        if (!item)
          throw new NotFoundException(
            `Product ${line.catalogItemId} not found`,
          );
        const variant = line.variantId
          ? item.variants.find((value) => value.id === line.variantId)
          : undefined;
        if (line.variantId && !variant)
          throw new BadRequestException(
            `Variant does not belong to ${item.name}`,
          );
        if (item.variants.length && !variant)
          throw new BadRequestException(
            `A variant is required for ${item.name}`,
          );
        const quantity = new Prisma.Decimal(line.quantity);
        const cost = new Prisma.Decimal(line.costPerItem);
        return { item, variant, quantity, cost, total: cost.mul(quantity) };
      }),
    );
    const totalCost = lines.reduce(
      (sum, line) => sum.plus(line.total),
      new Prisma.Decimal(0),
    );
    const amountPaid = new Prisma.Decimal(dto.amountPaid ?? 0);
    if (amountPaid.greaterThan(totalCost))
      throw new BadRequestException('Amount paid cannot exceed total cost');
    return this.database.$transaction(
      async (tx) => {
        const purchase = await tx.purchase.create({
          data: {
            businessId,
            branchId: branch.id,
            supplierId: supplier.id,
            totalCost,
            amountPaid,
            purchasedAt: dto.date ? new Date(dto.date) : undefined,
            items: {
              create: lines.map((line) => ({
                catalogItemId: line.item.id,
                variantId: line.variant?.id,
                itemName: line.item.name,
                variantSnapshot: line.variant?.attributes ?? undefined,
                quantity: line.quantity,
                costPerItem: line.cost,
                totalCost: line.total,
              })),
            },
          },
          include: { items: true, supplier: true, branch: true },
        });
        for (const line of lines) {
          if (line.item.trackStock)
            await this.inventory.changeStock(tx, {
              businessId,
              branchId: branch.id,
              catalogItemId: line.item.id,
              variantId: line.variant?.id,
              quantity: line.quantity,
              type: InventoryMovementType.PURCHASE,
              referenceType: 'PURCHASE',
              referenceId: purchase.id,
              occurredAt: purchase.purchasedAt,
            });
          if (line.variant)
            await tx.productVariant.update({
              where: { id: line.variant.id },
              data: { costPrice: line.cost },
            });
          else
            await tx.catalogItem.update({
              where: { id: line.item.id },
              data: { costPrice: line.cost },
            });
        }
        const due = totalCost.minus(amountPaid);
        if (!due.isZero())
          await tx.supplier.update({
            where: { id: supplier.id },
            data: { balance: { increment: due } },
          });
        return purchase;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }
  async list(userId: string, businessId: string) {
    await this.businesses.getOwned(userId, businessId);
    return this.database.purchase.findMany({
      where: { businessId },
      include: { supplier: true, items: true },
      orderBy: { purchasedAt: 'desc' },
    });
  }
  async get(userId: string, businessId: string, id: string) {
    await this.businesses.getOwned(userId, businessId);
    const value = await this.database.purchase.findFirst({
      where: { id, businessId },
      include: { supplier: true, branch: true, items: true },
    });
    if (!value) throw new NotFoundException('Purchase not found');
    return value;
  }
}
