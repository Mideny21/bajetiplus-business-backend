import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { BusinessType, CatalogItemType } from '@prisma/client';
import { DatabaseService } from '../../database/database.service';
import { BusinessesService } from '../businesses/businesses.service';
import {
  CreateCatalogItemDto,
  CreateCategoryDto,
  CreateVariantDto,
  UpdateCatalogItemDto,
  UpdateCategoryDto,
  UpdateVariantDto,
} from './dto/catalog.dto';

@Injectable()
export class CatalogService {
  constructor(
    private readonly database: DatabaseService,
    private readonly businesses: BusinessesService,
  ) {}

  async createCategory(
    userId: string,
    businessId: string,
    dto: CreateCategoryDto,
  ) {
    await this.businesses.getOwned(userId, businessId);
    return this.database.category.create({
      data: { businessId, name: dto.name.trim(), description: dto.description },
    });
  }
  async listCategories(
    userId: string,
    businessId: string,
    includeArchived = false,
  ) {
    await this.businesses.getOwned(userId, businessId);
    return this.database.category.findMany({
      where: { businessId, ...(includeArchived ? {} : { isActive: true }) },
      orderBy: { name: 'asc' },
    });
  }
  async updateCategory(
    userId: string,
    businessId: string,
    id: string,
    dto: UpdateCategoryDto,
  ) {
    await this.requireCategory(userId, businessId, id);
    return this.database.category.update({
      where: { id },
      data: { ...dto, name: dto.name?.trim() },
    });
  }
  async archiveCategory(userId: string, businessId: string, id: string) {
    await this.requireCategory(userId, businessId, id);
    return this.database.category.update({
      where: { id },
      data: { isActive: false },
    });
  }
  private async requireCategory(
    userId: string,
    businessId: string,
    id: string,
  ) {
    await this.businesses.getOwned(userId, businessId);
    const value = await this.database.category.findFirst({
      where: { id, businessId },
    });
    if (!value) throw new NotFoundException('Category not found');
    return value;
  }

  async createItem(
    userId: string,
    businessId: string,
    dto: CreateCatalogItemDto,
  ) {
    const business = await this.businesses.getOwned(userId, businessId);
    if (
      business.type === BusinessType.PRODUCT &&
      dto.type === CatalogItemType.SERVICE
    )
      throw new BadRequestException(
        'A PRODUCT business cannot create services',
      );
    if (
      business.type === BusinessType.SERVICE &&
      dto.type === CatalogItemType.PRODUCT
    )
      throw new BadRequestException(
        'A SERVICE business cannot create products',
      );
    if (dto.categoryId)
      await this.requireCategory(userId, businessId, dto.categoryId);
    if (
      dto.type === CatalogItemType.SERVICE &&
      (dto.trackStock ||
        dto.costPrice !== undefined ||
        dto.lowStockThreshold !== undefined)
    ) {
      throw new BadRequestException('Services cannot have inventory fields');
    }
    return this.database.catalogItem.create({
      data: {
        businessId,
        categoryId: dto.categoryId,
        type: dto.type,
        name: dto.name.trim(),
        description: dto.description,
        sellingPrice: dto.sellingPrice,
        costPrice: dto.type === CatalogItemType.PRODUCT ? dto.costPrice : null,
        sku: dto.sku?.trim() || null,
        trackStock:
          dto.type === CatalogItemType.PRODUCT
            ? (dto.trackStock ?? true)
            : false,
        lowStockThreshold:
          dto.type === CatalogItemType.PRODUCT ? dto.lowStockThreshold : null,
      },
      include: { category: true, variants: true },
    });
  }

  async listItems(
    userId: string,
    businessId: string,
    type?: CatalogItemType,
    includeArchived = false,
  ) {
    await this.businesses.getOwned(userId, businessId);
    return this.database.catalogItem.findMany({
      where: {
        businessId,
        ...(type ? { type } : {}),
        ...(includeArchived ? {} : { isActive: true }),
      },
      include: {
        category: true,
        variants: { where: includeArchived ? {} : { isActive: true } },
        inventoryBalances: true,
      },
      orderBy: { name: 'asc' },
    });
  }

  async requireItem(
    userId: string,
    businessId: string,
    id: string,
    activeOnly = false,
  ) {
    await this.businesses.getOwned(userId, businessId);
    const item = await this.database.catalogItem.findFirst({
      where: { id, businessId, ...(activeOnly ? { isActive: true } : {}) },
      include: { variants: true },
    });
    if (!item) throw new NotFoundException('Catalog item not found');
    return item;
  }
  async getItem(userId: string, businessId: string, id: string) {
    await this.requireItem(userId, businessId, id);
    return this.database.catalogItem.findUnique({
      where: { id },
      include: { category: true, variants: true, inventoryBalances: true },
    });
  }
  async updateItem(
    userId: string,
    businessId: string,
    id: string,
    dto: UpdateCatalogItemDto,
  ) {
    const item = await this.requireItem(userId, businessId, id);
    if (dto.categoryId)
      await this.requireCategory(userId, businessId, dto.categoryId);
    if (
      item.type === CatalogItemType.SERVICE &&
      (dto.trackStock ||
        dto.costPrice !== undefined ||
        dto.lowStockThreshold !== undefined)
    )
      throw new BadRequestException('Services cannot have inventory fields');
    return this.database.catalogItem.update({
      where: { id },
      data: {
        ...dto,
        name: dto.name?.trim(),
        sku: dto.sku?.trim() || undefined,
      },
      include: { category: true, variants: true },
    });
  }
  async archiveItem(userId: string, businessId: string, id: string) {
    await this.requireItem(userId, businessId, id);
    return this.database.catalogItem.update({
      where: { id },
      data: { isActive: false },
    });
  }

  async createVariant(
    userId: string,
    businessId: string,
    itemId: string,
    dto: CreateVariantDto,
  ) {
    const item = await this.requireItem(userId, businessId, itemId, true);
    if (item.type !== CatalogItemType.PRODUCT)
      throw new BadRequestException('Only products can have variants');
    const baseStock = await this.database.inventoryBalance.aggregate({
      where: { businessId, catalogItemId: itemId, variantId: null },
      _sum: { quantity: true },
    });
    if (baseStock._sum.quantity && !baseStock._sum.quantity.isZero())
      throw new BadRequestException(
        'Adjust base product stock to zero before adding variants',
      );
    return this.database.productVariant.create({
      data: {
        businessId,
        catalogItemId: itemId,
        name: dto.name.trim(),
        sku: dto.sku?.trim() || null,
        attributes: dto.attributes,
        costPrice: dto.costPrice,
        sellingPrice: dto.sellingPrice,
        lowStockThreshold: dto.lowStockThreshold,
      },
    });
  }
  async requireVariant(
    userId: string,
    businessId: string,
    itemId: string,
    variantId: string,
    activeOnly = false,
  ) {
    await this.requireItem(userId, businessId, itemId, activeOnly);
    const variant = await this.database.productVariant.findFirst({
      where: {
        id: variantId,
        businessId,
        catalogItemId: itemId,
        ...(activeOnly ? { isActive: true } : {}),
      },
    });
    if (!variant) throw new NotFoundException('Product variant not found');
    return variant;
  }
  async updateVariant(
    userId: string,
    businessId: string,
    itemId: string,
    variantId: string,
    dto: UpdateVariantDto,
  ) {
    await this.requireVariant(userId, businessId, itemId, variantId);
    return this.database.productVariant.update({
      where: { id: variantId },
      data: {
        ...dto,
        name: dto.name?.trim(),
        sku: dto.sku?.trim() || undefined,
        attributes: dto.attributes,
      },
    });
  }
  async archiveVariant(
    userId: string,
    businessId: string,
    itemId: string,
    variantId: string,
  ) {
    await this.requireVariant(userId, businessId, itemId, variantId);
    return this.database.productVariant.update({
      where: { id: variantId },
      data: { isActive: false },
    });
  }
}
