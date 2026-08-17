import { BadRequestException, Injectable } from '@nestjs/common';
import { CatalogItemType, InventoryMovementType, Prisma } from '@prisma/client';
import { DatabaseService } from '../../database/database.service';
import { BusinessesService } from '../businesses/businesses.service';
import { CatalogService } from '../catalog/catalog.service';
import { AdjustInventoryDto, InventoryOperation } from './dto/inventory.dto';

type DbClient = Prisma.TransactionClient | DatabaseService;

export interface StockChange {
  businessId: string;
  branchId: string;
  catalogItemId: string;
  variantId?: string;
  quantity: Prisma.Decimal.Value;
  type: InventoryMovementType;
  referenceType?: string;
  referenceId?: string;
  note?: string;
  occurredAt?: Date;
  allowNegative?: boolean;
}

@Injectable()
export class InventoryService {
  constructor(
    private readonly database: DatabaseService,
    private readonly businesses: BusinessesService,
    private readonly catalog: CatalogService,
  ) {}

  async list(userId: string, businessId: string) {
    const branch = await this.businesses.getMainBranch(userId, businessId);
    return this.database.inventoryBalance.findMany({
      where: { businessId, branchId: branch.id },
      include: {
        catalogItem: {
          select: {
            id: true,
            name: true,
            sku: true,
            lowStockThreshold: true,
            isActive: true,
          },
        },
        variant: true,
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async history(userId: string, businessId: string, catalogItemId?: string) {
    const branch = await this.businesses.getMainBranch(userId, businessId);
    return this.database.inventoryMovement.findMany({
      where: {
        businessId,
        branchId: branch.id,
        ...(catalogItemId ? { catalogItemId } : {}),
      },
      include: {
        catalogItem: { select: { id: true, name: true, sku: true } },
        variant: true,
      },
      orderBy: { occurredAt: 'desc' },
      take: 500,
    });
  }

  async adjust(userId: string, businessId: string, dto: AdjustInventoryDto) {
    const branch = await this.businesses.getMainBranch(userId, businessId);
    const item = await this.catalog.requireItem(
      userId,
      businessId,
      dto.catalogItemId,
      true,
    );
    if (item.type !== CatalogItemType.PRODUCT || !item.trackStock)
      throw new BadRequestException(
        'Inventory is only available for stock-tracked products',
      );
    const activeVariants = item.variants.filter((v) => v.isActive);
    if (activeVariants.length && !dto.variantId)
      throw new BadRequestException('A variant is required for this product');
    if (!activeVariants.length && dto.variantId)
      throw new BadRequestException('This product has no variants');
    if (dto.variantId)
      await this.catalog.requireVariant(
        userId,
        businessId,
        item.id,
        dto.variantId,
        true,
      );
    if (dto.operation !== InventoryOperation.ADJUSTMENT && dto.quantity < 0)
      throw new BadRequestException(
        'Quantity must be positive for this operation',
      );
    if (dto.operation === InventoryOperation.OPENING) {
      const prior = await this.database.inventoryMovement.count({
        where: {
          businessId,
          branchId: branch.id,
          catalogItemId: item.id,
          variantId: dto.variantId ?? null,
        },
      });
      if (prior)
        throw new BadRequestException(
          'Opening stock has already been recorded',
        );
    }
    const movementType = this.movementType(dto.operation, dto.quantity);
    const signed =
      dto.operation === InventoryOperation.STOCK_OUT
        ? -dto.quantity
        : dto.quantity;
    return this.database.$transaction(
      (tx) =>
        this.changeStock(tx, {
          businessId,
          branchId: branch.id,
          catalogItemId: item.id,
          variantId: dto.variantId,
          quantity: signed,
          type: movementType,
          note: dto.note,
          occurredAt: dto.occurredAt ? new Date(dto.occurredAt) : undefined,
        }),
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }

  async changeStock(client: DbClient, change: StockChange) {
    const quantity = new Prisma.Decimal(change.quantity);
    const stockKey = change.variantId ?? 'BASE';
    const existing = await client.inventoryBalance.findUnique({
      where: {
        businessId_branchId_catalogItemId_stockKey: {
          businessId: change.businessId,
          branchId: change.branchId,
          catalogItemId: change.catalogItemId,
          stockKey,
        },
      },
    });
    const next = (existing?.quantity ?? new Prisma.Decimal(0)).plus(quantity);
    if (next.isNegative() && !change.allowNegative)
      throw new BadRequestException('Insufficient stock');
    const balance = await client.inventoryBalance.upsert({
      where: {
        businessId_branchId_catalogItemId_stockKey: {
          businessId: change.businessId,
          branchId: change.branchId,
          catalogItemId: change.catalogItemId,
          stockKey,
        },
      },
      create: {
        businessId: change.businessId,
        branchId: change.branchId,
        catalogItemId: change.catalogItemId,
        variantId: change.variantId,
        stockKey,
        quantity: next,
      },
      update: { quantity: next },
    });
    const movement = await client.inventoryMovement.create({
      data: {
        businessId: change.businessId,
        branchId: change.branchId,
        catalogItemId: change.catalogItemId,
        variantId: change.variantId,
        type: change.type,
        quantity,
        balanceAfter: next,
        referenceType: change.referenceType,
        referenceId: change.referenceId,
        note: change.note,
        occurredAt: change.occurredAt,
      },
    });
    return { balance, movement };
  }

  private movementType(
    operation: InventoryOperation,
    quantity: number,
  ): InventoryMovementType {
    if (operation === InventoryOperation.OPENING)
      return InventoryMovementType.OPENING;
    if (operation === InventoryOperation.STOCK_IN)
      return InventoryMovementType.STOCK_IN;
    if (operation === InventoryOperation.STOCK_OUT)
      return InventoryMovementType.STOCK_OUT;
    return quantity > 0
      ? InventoryMovementType.ADJUSTMENT_IN
      : InventoryMovementType.ADJUSTMENT_OUT;
  }
}
