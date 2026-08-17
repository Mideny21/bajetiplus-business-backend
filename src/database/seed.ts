import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import {
  BusinessType,
  CatalogItemType,
  InventoryMovementType,
  PaymentMethod,
  Prisma,
  PrismaClient,
} from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error('DATABASE_URL is required');
if (process.env.NODE_ENV === 'production') {
  throw new Error('Development seed data cannot be loaded in production');
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: databaseUrl }),
});

const ids = {
  business: '00000000-0000-4000-8000-000000000001',
  branch: '00000000-0000-4000-8000-000000000002',
  productCategory: '00000000-0000-4000-8000-000000001001',
  serviceCategory: '00000000-0000-4000-8000-000000001002',
  rice: '00000000-0000-4000-8000-000000002001',
  shirt: '00000000-0000-4000-8000-000000002002',
  delivery: '00000000-0000-4000-8000-000000002003',
  blackMedium: '00000000-0000-4000-8000-000000003001',
  whiteLarge: '00000000-0000-4000-8000-000000003002',
  customer: '00000000-0000-4000-8000-000000004001',
  supplier: '00000000-0000-4000-8000-000000004002',
  purchase: '00000000-0000-4000-8000-000000005001',
  sale: '00000000-0000-4000-8000-000000005002',
  purchaseItem: '00000000-0000-4000-8000-000000005101',
  riceSaleItem: '00000000-0000-4000-8000-000000005201',
  shirtSaleItem: '00000000-0000-4000-8000-000000005202',
  serviceSaleItem: '00000000-0000-4000-8000-000000005203',
  expenseCategory: '00000000-0000-4000-8000-000000006001',
  expense: '00000000-0000-4000-8000-000000006002',
  riceBalance: '00000000-0000-4000-8000-000000007001',
  blackMediumBalance: '00000000-0000-4000-8000-000000007002',
  whiteLargeBalance: '00000000-0000-4000-8000-000000007003',
  riceOpening: '00000000-0000-4000-8000-000000008001',
  ricePurchase: '00000000-0000-4000-8000-000000008002',
  riceSale: '00000000-0000-4000-8000-000000008003',
  blackOpening: '00000000-0000-4000-8000-000000008004',
  blackSale: '00000000-0000-4000-8000-000000008005',
  whiteOpening: '00000000-0000-4000-8000-000000008006',
} as const;

const demoEmail = process.env.SEED_DEMO_EMAIL ?? 'demo@bajetiplus.test';
const demoPassword = process.env.SEED_DEMO_PASSWORD ?? 'DemoPassword123';

async function main(): Promise<void> {
  const now = new Date();
  const passwordHash = await bcrypt.hash(demoPassword, 12);
  const user = await prisma.user.upsert({
    where: { email: demoEmail },
    create: { email: demoEmail, passwordHash, isActive: true },
    update: { passwordHash, isActive: true },
  });

  await prisma.$transaction(
    async (tx) => {
      await tx.business.upsert({
        where: { id: ids.business },
        create: {
          id: ids.business,
          ownerId: user.id,
          name: 'Bajeti Demo Shop',
          industry: 'grocery-retail',
          type: BusinessType.HYBRID,
          currency: 'TZS',
          settings: { receiptFooter: 'Thank you for shopping with us' },
          enabledFeatures: [
            'products',
            'services',
            'inventory',
            'variants',
            'sales',
            'purchases',
            'expenses',
          ],
        },
        update: { ownerId: user.id, isActive: true },
      });
      await tx.branch.upsert({
        where: { id: ids.branch },
        create: {
          id: ids.branch,
          businessId: ids.business,
          name: 'Main Branch',
          isMain: true,
        },
        update: { isMain: true, isActive: true },
      });

      await tx.category.upsert({
        where: { id: ids.productCategory },
        create: {
          id: ids.productCategory,
          businessId: ids.business,
          name: 'Retail Products',
          description: 'Seeded retail products',
        },
        update: { isActive: true },
      });
      await tx.category.upsert({
        where: { id: ids.serviceCategory },
        create: {
          id: ids.serviceCategory,
          businessId: ids.business,
          name: 'Services',
        },
        update: { isActive: true },
      });

      await tx.catalogItem.upsert({
        where: { id: ids.rice },
        create: {
          id: ids.rice,
          businessId: ids.business,
          categoryId: ids.productCategory,
          type: CatalogItemType.PRODUCT,
          name: 'Premium Rice 1kg',
          description: 'Product without variants',
          sku: 'RICE-1KG',
          costPrice: 1800,
          sellingPrice: 2500,
          trackStock: true,
          lowStockThreshold: 20,
        },
        update: { isActive: true },
      });
      await tx.catalogItem.upsert({
        where: { id: ids.shirt },
        create: {
          id: ids.shirt,
          businessId: ids.business,
          categoryId: ids.productCategory,
          type: CatalogItemType.PRODUCT,
          name: 'Classic T-Shirt',
          description: 'Product with flexible Size and Color variants',
          sku: 'TSHIRT',
          costPrice: 12000,
          sellingPrice: 18000,
          trackStock: true,
          lowStockThreshold: 5,
        },
        update: { isActive: true },
      });
      await tx.catalogItem.upsert({
        where: { id: ids.delivery },
        create: {
          id: ids.delivery,
          businessId: ids.business,
          categoryId: ids.serviceCategory,
          type: CatalogItemType.SERVICE,
          name: 'Local Delivery',
          description: 'Service item with no inventory',
          sellingPrice: 10000,
          trackStock: false,
        },
        update: { isActive: true },
      });

      await tx.productVariant.upsert({
        where: { id: ids.blackMedium },
        create: {
          id: ids.blackMedium,
          businessId: ids.business,
          catalogItemId: ids.shirt,
          name: 'Black / Medium',
          sku: 'TSHIRT-BLK-M',
          attributes: { Color: 'Black', Size: 'M' },
          costPrice: 12000,
          sellingPrice: 18000,
          lowStockThreshold: 5,
        },
        update: { isActive: true },
      });
      await tx.productVariant.upsert({
        where: { id: ids.whiteLarge },
        create: {
          id: ids.whiteLarge,
          businessId: ids.business,
          catalogItemId: ids.shirt,
          name: 'White / Large',
          sku: 'TSHIRT-WHT-L',
          attributes: { Color: 'White', Size: 'L' },
          costPrice: 12000,
          sellingPrice: 18000,
          lowStockThreshold: 5,
        },
        update: { isActive: true },
      });

      await tx.customer.upsert({
        where: { id: ids.customer },
        create: {
          id: ids.customer,
          businessId: ids.business,
          name: 'Amina Customer',
          phone: '255712000001',
          email: 'amina@example.test',
          notes: 'Seed customer with a credit sale',
          balance: 58500,
        },
        update: { balance: 58500, isActive: true },
      });
      await tx.supplier.upsert({
        where: { id: ids.supplier },
        create: {
          id: ids.supplier,
          businessId: ids.business,
          name: 'Dar Wholesale Supplies',
          phone: '255713000001',
          email: 'sales@example.test',
          notes: 'Seed supplier with an outstanding balance',
          balance: 30000,
        },
        update: { balance: 30000, isActive: true },
      });

      await tx.purchase.upsert({
        where: { id: ids.purchase },
        create: {
          id: ids.purchase,
          businessId: ids.business,
          branchId: ids.branch,
          supplierId: ids.supplier,
          totalCost: 90000,
          amountPaid: 60000,
          purchasedAt: now,
        },
        update: { purchasedAt: now },
      });
      await tx.purchaseItem.upsert({
        where: { id: ids.purchaseItem },
        create: {
          id: ids.purchaseItem,
          purchaseId: ids.purchase,
          catalogItemId: ids.rice,
          itemName: 'Premium Rice 1kg',
          quantity: 50,
          costPerItem: 1800,
          totalCost: 90000,
        },
        update: { quantity: 50, totalCost: 90000 },
      });

      await tx.sale.upsert({
        where: { id: ids.sale },
        create: {
          id: ids.sale,
          businessId: ids.business,
          branchId: ids.branch,
          customerId: ids.customer,
          paymentMethod: PaymentMethod.CREDIT,
          subtotal: 58500,
          discount: 0,
          total: 58500,
          soldAt: now,
        },
        update: { soldAt: now },
      });
      await tx.saleItem.upsert({
        where: { id: ids.riceSaleItem },
        create: {
          id: ids.riceSaleItem,
          saleId: ids.sale,
          catalogItemId: ids.rice,
          itemName: 'Premium Rice 1kg',
          itemType: CatalogItemType.PRODUCT,
          quantity: 5,
          unitPrice: 2500,
          total: 12500,
          unitCostSnapshot: 1800,
        },
        update: { quantity: 5, total: 12500 },
      });
      await tx.saleItem.upsert({
        where: { id: ids.shirtSaleItem },
        create: {
          id: ids.shirtSaleItem,
          saleId: ids.sale,
          catalogItemId: ids.shirt,
          variantId: ids.blackMedium,
          itemName: 'Classic T-Shirt',
          variantSnapshot: { Color: 'Black', Size: 'M' },
          itemType: CatalogItemType.PRODUCT,
          quantity: 2,
          unitPrice: 18000,
          total: 36000,
          unitCostSnapshot: 12000,
        },
        update: { quantity: 2, total: 36000 },
      });
      await tx.saleItem.upsert({
        where: { id: ids.serviceSaleItem },
        create: {
          id: ids.serviceSaleItem,
          saleId: ids.sale,
          catalogItemId: ids.delivery,
          itemName: 'Local Delivery',
          itemType: CatalogItemType.SERVICE,
          quantity: 1,
          unitPrice: 10000,
          total: 10000,
        },
        update: { quantity: 1, total: 10000 },
      });

      const balances = [
        {
          id: ids.riceBalance,
          catalogItemId: ids.rice,
          variantId: null,
          stockKey: 'BASE',
          quantity: new Prisma.Decimal(145),
        },
        {
          id: ids.blackMediumBalance,
          catalogItemId: ids.shirt,
          variantId: ids.blackMedium,
          stockKey: ids.blackMedium,
          quantity: new Prisma.Decimal(18),
        },
        {
          id: ids.whiteLargeBalance,
          catalogItemId: ids.shirt,
          variantId: ids.whiteLarge,
          stockKey: ids.whiteLarge,
          quantity: new Prisma.Decimal(12),
        },
      ];
      for (const balance of balances) {
        await tx.inventoryBalance.upsert({
          where: { id: balance.id },
          create: {
            ...balance,
            businessId: ids.business,
            branchId: ids.branch,
          },
          update: { quantity: balance.quantity },
        });
      }

      const movements = [
        {
          id: ids.riceOpening,
          catalogItemId: ids.rice,
          variantId: null,
          type: InventoryMovementType.OPENING,
          quantity: 100,
          balanceAfter: 100,
          referenceType: 'SEED',
          referenceId: null,
        },
        {
          id: ids.ricePurchase,
          catalogItemId: ids.rice,
          variantId: null,
          type: InventoryMovementType.PURCHASE,
          quantity: 50,
          balanceAfter: 150,
          referenceType: 'PURCHASE',
          referenceId: ids.purchase,
        },
        {
          id: ids.riceSale,
          catalogItemId: ids.rice,
          variantId: null,
          type: InventoryMovementType.SALE,
          quantity: -5,
          balanceAfter: 145,
          referenceType: 'SALE',
          referenceId: ids.sale,
        },
        {
          id: ids.blackOpening,
          catalogItemId: ids.shirt,
          variantId: ids.blackMedium,
          type: InventoryMovementType.OPENING,
          quantity: 20,
          balanceAfter: 20,
          referenceType: 'SEED',
          referenceId: null,
        },
        {
          id: ids.blackSale,
          catalogItemId: ids.shirt,
          variantId: ids.blackMedium,
          type: InventoryMovementType.SALE,
          quantity: -2,
          balanceAfter: 18,
          referenceType: 'SALE',
          referenceId: ids.sale,
        },
        {
          id: ids.whiteOpening,
          catalogItemId: ids.shirt,
          variantId: ids.whiteLarge,
          type: InventoryMovementType.OPENING,
          quantity: 12,
          balanceAfter: 12,
          referenceType: 'SEED',
          referenceId: null,
        },
      ];
      for (const movement of movements) {
        await tx.inventoryMovement.upsert({
          where: { id: movement.id },
          create: {
            ...movement,
            businessId: ids.business,
            branchId: ids.branch,
            note: 'Development seed data',
            occurredAt: now,
          },
          update: {
            quantity: movement.quantity,
            balanceAfter: movement.balanceAfter,
            occurredAt: now,
          },
        });
      }

      await tx.expenseCategory.upsert({
        where: { id: ids.expenseCategory },
        create: {
          id: ids.expenseCategory,
          businessId: ids.business,
          name: 'Transport',
        },
        update: { isActive: true },
      });
      await tx.expense.upsert({
        where: { id: ids.expense },
        create: {
          id: ids.expense,
          businessId: ids.business,
          branchId: ids.branch,
          categoryId: ids.expenseCategory,
          amount: 15000,
          description: 'Seed delivery and transport expense',
          incurredAt: now,
        },
        update: { incurredAt: now },
      });
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );

  console.log('Bajeti Plus Business development seed completed.');
  console.log(`Demo login: ${demoEmail} / ${demoPassword}`);
  console.log(`Business ID: ${ids.business}`);
}

main()
  .finally(() => prisma.$disconnect())
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
