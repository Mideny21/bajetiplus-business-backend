import { BadRequestException, Injectable } from '@nestjs/common';
import {
  BusinessType,
  CatalogItemType,
  InventoryMovementType,
  Prisma,
} from '@prisma/client';
import ExcelJS from 'exceljs';
import { DatabaseService } from '../../database/database.service';
import { BusinessesService } from '../businesses/businesses.service';
import { InventoryService } from '../inventory/inventory.service';

interface ProductRow {
  row: number;
  name: string;
  category?: string;
  sku?: string;
  costPrice: number;
  sellingPrice: number;
  openingStock: number;
  lowStockLevel: number;
}
export interface RowError {
  row: number;
  errors: string[];
}
export interface ProductImportResult {
  totalRows: number;
  createdCount: number;
  errorCount: number;
  created: { row: number; id: string; name: string }[];
  errors: RowError[];
}

@Injectable()
export class ProductImportService {
  constructor(
    private readonly database: DatabaseService,
    private readonly businesses: BusinessesService,
    private readonly inventory: InventoryService,
  ) {}
  async template(): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Products');
    sheet.columns = [
      { header: 'Product Name', key: 'name', width: 28 },
      { header: 'Category', key: 'category', width: 22 },
      { header: 'SKU', key: 'sku', width: 18 },
      { header: 'Cost Price', key: 'cost', width: 15 },
      { header: 'Selling Price', key: 'selling', width: 15 },
      { header: 'Opening Stock', key: 'stock', width: 16 },
      { header: 'Low Stock Level', key: 'low', width: 18 },
    ];
    sheet.getRow(1).font = { bold: true };
    sheet.addRow({
      name: 'Example Product',
      category: 'General',
      sku: 'SKU-001',
      cost: 1000,
      selling: 1500,
      stock: 10,
      low: 2,
    });
    sheet.views = [{ state: 'frozen', ySplit: 1 }];
    const output = await workbook.xlsx.writeBuffer();
    return Buffer.from(output);
  }
  async import(
    userId: string,
    businessId: string,
    file: Express.Multer.File,
  ): Promise<ProductImportResult> {
    if (!file) throw new BadRequestException('Excel file is required');
    const business = await this.businesses.getOwned(userId, businessId);
    if (business.type === BusinessType.SERVICE)
      throw new BadRequestException(
        'A SERVICE business cannot import products',
      );
    const branch = await this.businesses.getMainBranch(userId, businessId);
    const workbook = new ExcelJS.Workbook();
    try {
      await workbook.xlsx.load(
        file.buffer as unknown as Parameters<typeof workbook.xlsx.load>[0],
      );
    } catch {
      throw new BadRequestException(
        'The uploaded file is not a valid .xlsx workbook',
      );
    }
    const sheet = workbook.worksheets[0];
    if (!sheet) throw new BadRequestException('Workbook has no worksheet');
    const expected = [
      'Product Name',
      'Category',
      'SKU',
      'Cost Price',
      'Selling Price',
      'Opening Stock',
      'Low Stock Level',
    ];
    const actual = expected.map((_, index) =>
      this.text(sheet.getRow(1).getCell(index + 1).value),
    );
    if (expected.some((header, index) => actual[index] !== header))
      throw new BadRequestException(
        `Invalid template headers. Expected: ${expected.join(', ')}`,
      );
    const rows: ProductRow[] = [];
    const errors: RowError[] = [];
    const fileSkus = new Set<string>();
    let totalRows = 0;
    for (let index = 2; index <= sheet.rowCount; index++) {
      const row = sheet.getRow(index);
      const name = this.text(row.getCell(1).value).trim();
      if (
        !name &&
        [2, 3, 4, 5, 6, 7].every(
          (cell) => !this.text(row.getCell(cell).value).trim(),
        )
      )
        continue;
      totalRows++;
      const sku = this.text(row.getCell(3).value).trim() || undefined;
      const costPrice = this.number(row.getCell(4).value);
      const sellingPrice = this.number(row.getCell(5).value);
      const openingStock = this.number(row.getCell(6).value, 0);
      const lowStockLevel = this.number(row.getCell(7).value, 0);
      const rowErrors: string[] = [];
      if (!name) rowErrors.push('Product Name is required');
      if (costPrice === null || costPrice < 0)
        rowErrors.push('Cost Price must be zero or greater');
      if (sellingPrice === null || sellingPrice < 0)
        rowErrors.push('Selling Price must be zero or greater');
      if (openingStock === null || openingStock < 0)
        rowErrors.push('Opening Stock must be zero or greater');
      if (lowStockLevel === null || lowStockLevel < 0)
        rowErrors.push('Low Stock Level must be zero or greater');
      if (sku && fileSkus.has(sku.toLowerCase()))
        rowErrors.push('SKU is duplicated in the file');
      if (sku) fileSkus.add(sku.toLowerCase());
      if (rowErrors.length) errors.push({ row: index, errors: rowErrors });
      else
        rows.push({
          row: index,
          name,
          category: this.text(row.getCell(2).value).trim() || undefined,
          sku,
          costPrice: costPrice!,
          sellingPrice: sellingPrice!,
          openingStock: openingStock!,
          lowStockLevel: lowStockLevel!,
        });
    }
    const created: { row: number; id: string; name: string }[] = [];
    for (const row of rows) {
      try {
        if (row.sku) {
          const duplicate = await this.database.catalogItem.findFirst({
            where: {
              businessId,
              sku: { equals: row.sku, mode: 'insensitive' },
            },
          });
          if (duplicate) {
            errors.push({
              row: row.row,
              errors: [`SKU ${row.sku} already exists`],
            });
            continue;
          }
        }
        const product = await this.database.$transaction(
          async (tx) => {
            let categoryId: string | undefined;
            if (row.category) {
              let category = await tx.category.findFirst({
                where: {
                  businessId,
                  name: { equals: row.category, mode: 'insensitive' },
                },
              });
              category ??= await tx.category.create({
                data: { businessId, name: row.category },
              });
              categoryId = category.id;
            }
            const item = await tx.catalogItem.create({
              data: {
                businessId,
                categoryId,
                type: CatalogItemType.PRODUCT,
                name: row.name,
                sku: row.sku,
                costPrice: row.costPrice,
                sellingPrice: row.sellingPrice,
                trackStock: true,
                lowStockThreshold: row.lowStockLevel,
              },
            });
            if (row.openingStock > 0)
              await this.inventory.changeStock(tx, {
                businessId,
                branchId: branch.id,
                catalogItemId: item.id,
                quantity: new Prisma.Decimal(row.openingStock),
                type: InventoryMovementType.OPENING,
                referenceType: 'PRODUCT_IMPORT',
              });
            return item;
          },
          { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
        );
        created.push({ row: row.row, id: product.id, name: product.name });
      } catch (error) {
        errors.push({
          row: row.row,
          errors: [
            error instanceof Error ? error.message : 'Could not create product',
          ],
        });
      }
    }
    errors.sort((a, b) => a.row - b.row);
    return {
      totalRows,
      createdCount: created.length,
      errorCount: errors.length,
      created,
      errors,
    };
  }
  private text(value: ExcelJS.CellValue): string {
    if (value === null || value === undefined) return '';
    if (typeof value === 'string' || typeof value === 'number')
      return String(value);
    if (typeof value === 'boolean') return value ? 'true' : 'false';
    if (value instanceof Date) return value.toISOString();
    if (typeof value === 'object') {
      if ('text' in value && typeof value.text === 'string') return value.text;
      if ('richText' in value)
        return value.richText.map((part) => part.text).join('');
      if ('result' in value) return this.text(value.result);
    }
    return '';
  }
  private number(
    value: ExcelJS.CellValue,
    blankDefault?: number,
  ): number | null {
    const raw = this.text(value).trim();
    if (!raw && blankDefault !== undefined) return blankDefault;
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : null;
  }
}
