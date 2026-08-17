/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return, @typescript-eslint/unbound-method */
import { BadRequestException } from '@nestjs/common';
import { InventoryMovementType, Prisma } from '@prisma/client';
import { DatabaseService } from '../../database/database.service';
import { BusinessesService } from '../businesses/businesses.service';
import { CatalogService } from '../catalog/catalog.service';
import { InventoryService } from './inventory.service';

describe('InventoryService', () => {
  it('prevents stock from becoming negative', async () => {
    const database = {
      inventoryBalance: {
        findUnique: jest
          .fn()
          .mockResolvedValue({ quantity: new Prisma.Decimal(2) }),
        upsert: jest.fn(),
      },
      inventoryMovement: { create: jest.fn() },
    } as unknown as DatabaseService;
    const service = new InventoryService(
      database,
      {} as BusinessesService,
      {} as CatalogService,
    );

    await expect(
      service.changeStock(database, {
        businessId: 'business',
        branchId: 'branch',
        catalogItemId: 'product',
        quantity: -3,
        type: InventoryMovementType.SALE,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(database.inventoryBalance.upsert).not.toHaveBeenCalled();
  });

  it('writes a movement with the resulting balance', async () => {
    const movementCreate = jest.fn().mockImplementation(({ data }) => data);
    const database = {
      inventoryBalance: {
        findUnique: jest
          .fn()
          .mockResolvedValue({ quantity: new Prisma.Decimal(2) }),
        upsert: jest
          .fn()
          .mockImplementation(({ update }) => ({ quantity: update.quantity })),
      },
      inventoryMovement: { create: movementCreate },
    } as unknown as DatabaseService;
    const service = new InventoryService(
      database,
      {} as BusinessesService,
      {} as CatalogService,
    );

    const result = await service.changeStock(database, {
      businessId: 'business',
      branchId: 'branch',
      catalogItemId: 'product',
      quantity: 5,
      type: InventoryMovementType.PURCHASE,
    });

    expect(result.balance.quantity.toString()).toBe('7');
    expect(movementCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        balanceAfter: new Prisma.Decimal(7),
        quantity: new Prisma.Decimal(5),
      }),
    });
  });
});
