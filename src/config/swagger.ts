import { INestApplication } from '@nestjs/common';
import { OpenAPIObject, SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

type Schema = Record<string, unknown>;

const objectId = { type: 'string', format: 'uuid' };
const money = { type: 'string', example: '1500.00' };
const quantity = { type: 'string', example: '10.000' };

const responseSchemas: Record<string, Schema> = {
  HealthStatus: {
    type: 'object',
    properties: {
      status: { type: 'string', example: 'ok' },
      database: { type: 'string', example: 'up' },
      redis: { type: 'string', example: 'up' },
    },
  },
  User: {
    type: 'object',
    properties: {
      id: objectId,
      email: { type: 'string', nullable: true },
      mobile: { type: 'string', nullable: true },
      role: { type: 'string', enum: ['USER', 'ADMIN'] },
      isActive: { type: 'boolean' },
      createdAt: { type: 'string', format: 'date-time' },
    },
  },
  TokenPair: {
    type: 'object',
    required: ['accessToken', 'refreshToken', 'user'],
    properties: {
      accessToken: { type: 'string' },
      refreshToken: { type: 'string' },
      user: { $ref: '#/components/schemas/User' },
    },
  },
  IndustryProfile: {
    type: 'object',
    properties: {
      id: { type: 'string' },
      name: { type: 'string' },
      recommendedBusinessType: {
        type: 'string',
        enum: ['PRODUCT', 'SERVICE', 'HYBRID'],
      },
      recommendedFeatures: { type: 'array', items: { type: 'string' } },
    },
  },
  Branch: {
    type: 'object',
    properties: {
      id: objectId,
      businessId: objectId,
      name: { type: 'string' },
      isMain: { type: 'boolean' },
      isActive: { type: 'boolean' },
    },
  },
  Business: {
    type: 'object',
    properties: {
      id: objectId,
      ownerId: objectId,
      name: { type: 'string' },
      industry: { type: 'string' },
      type: { type: 'string', enum: ['PRODUCT', 'SERVICE', 'HYBRID'] },
      currency: { type: 'string' },
      settings: { type: 'object', nullable: true, additionalProperties: true },
      enabledFeatures: { type: 'array', items: { type: 'string' } },
      isActive: { type: 'boolean' },
      branches: {
        type: 'array',
        items: { $ref: '#/components/schemas/Branch' },
      },
    },
  },
  Category: {
    type: 'object',
    properties: {
      id: objectId,
      businessId: objectId,
      name: { type: 'string' },
      description: { type: 'string', nullable: true },
      isActive: { type: 'boolean' },
    },
  },
  ProductVariant: {
    type: 'object',
    properties: {
      id: objectId,
      businessId: objectId,
      catalogItemId: objectId,
      name: { type: 'string' },
      sku: { type: 'string', nullable: true },
      attributes: { type: 'object', additionalProperties: { type: 'string' } },
      costPrice: { ...money, nullable: true },
      sellingPrice: { ...money, nullable: true },
      lowStockThreshold: { ...quantity, nullable: true },
      isActive: { type: 'boolean' },
    },
  },
  CatalogItem: {
    type: 'object',
    properties: {
      id: objectId,
      businessId: objectId,
      categoryId: { ...objectId, nullable: true },
      type: { type: 'string', enum: ['PRODUCT', 'SERVICE'] },
      name: { type: 'string' },
      description: { type: 'string', nullable: true },
      sellingPrice: money,
      costPrice: { ...money, nullable: true },
      sku: { type: 'string', nullable: true },
      trackStock: { type: 'boolean' },
      lowStockThreshold: { ...quantity, nullable: true },
      isActive: { type: 'boolean' },
      category: { $ref: '#/components/schemas/Category' },
      variants: {
        type: 'array',
        items: { $ref: '#/components/schemas/ProductVariant' },
      },
    },
  },
  InventoryBalance: {
    type: 'object',
    properties: {
      id: objectId,
      businessId: objectId,
      branchId: objectId,
      catalogItemId: objectId,
      variantId: { ...objectId, nullable: true },
      quantity,
    },
  },
  InventoryMovement: {
    type: 'object',
    properties: {
      id: objectId,
      businessId: objectId,
      branchId: objectId,
      catalogItemId: objectId,
      variantId: { ...objectId, nullable: true },
      type: { type: 'string' },
      quantity,
      balanceAfter: quantity,
      referenceType: { type: 'string', nullable: true },
      referenceId: { ...objectId, nullable: true },
      note: { type: 'string', nullable: true },
      occurredAt: { type: 'string', format: 'date-time' },
    },
  },
  Customer: {
    type: 'object',
    properties: {
      id: objectId,
      businessId: objectId,
      name: { type: 'string' },
      phone: { type: 'string' },
      email: { type: 'string', nullable: true },
      notes: { type: 'string', nullable: true },
      balance: money,
      isActive: { type: 'boolean' },
      sales: { type: 'array', items: { $ref: '#/components/schemas/Sale' } },
    },
  },
  Supplier: {
    type: 'object',
    properties: {
      id: objectId,
      businessId: objectId,
      name: { type: 'string' },
      phone: { type: 'string' },
      email: { type: 'string', nullable: true },
      notes: { type: 'string', nullable: true },
      balance: money,
      isActive: { type: 'boolean' },
      purchases: {
        type: 'array',
        items: { $ref: '#/components/schemas/Purchase' },
      },
    },
  },
  SaleItem: {
    type: 'object',
    properties: {
      id: objectId,
      catalogItemId: objectId,
      variantId: { ...objectId, nullable: true },
      itemName: { type: 'string' },
      itemType: { type: 'string', enum: ['PRODUCT', 'SERVICE'] },
      quantity,
      unitPrice: money,
      discount: money,
      total: money,
    },
  },
  Sale: {
    type: 'object',
    properties: {
      id: objectId,
      businessId: objectId,
      branchId: objectId,
      customerId: { ...objectId, nullable: true },
      paymentMethod: {
        type: 'string',
        enum: ['CASH', 'MOBILE_MONEY', 'BANK', 'CARD', 'CREDIT'],
      },
      subtotal: money,
      discount: money,
      total: money,
      soldAt: { type: 'string', format: 'date-time' },
      items: {
        type: 'array',
        items: { $ref: '#/components/schemas/SaleItem' },
      },
    },
  },
  PurchaseItem: {
    type: 'object',
    properties: {
      id: objectId,
      catalogItemId: objectId,
      variantId: { ...objectId, nullable: true },
      itemName: { type: 'string' },
      quantity,
      costPerItem: money,
      totalCost: money,
    },
  },
  Purchase: {
    type: 'object',
    properties: {
      id: objectId,
      businessId: objectId,
      branchId: objectId,
      supplierId: objectId,
      totalCost: money,
      amountPaid: money,
      purchasedAt: { type: 'string', format: 'date-time' },
      items: {
        type: 'array',
        items: { $ref: '#/components/schemas/PurchaseItem' },
      },
    },
  },
  ExpenseCategory: {
    type: 'object',
    properties: {
      id: objectId,
      businessId: objectId,
      name: { type: 'string' },
      isActive: { type: 'boolean' },
    },
  },
  Expense: {
    type: 'object',
    properties: {
      id: objectId,
      businessId: objectId,
      branchId: objectId,
      categoryId: objectId,
      amount: money,
      description: { type: 'string', nullable: true },
      incurredAt: { type: 'string', format: 'date-time' },
      category: { $ref: '#/components/schemas/ExpenseCategory' },
    },
  },
  Dashboard: {
    type: 'object',
    properties: {
      period: { type: 'object' },
      totalSales: money,
      totalExpenses: money,
      estimatedGrossProfit: money,
      numberOfSales: { type: 'integer' },
      stockValue: money,
      topSellingProducts: { type: 'array', items: { type: 'object' } },
      lowStockProducts: { type: 'array', items: { type: 'object' } },
    },
  },
  ProductImportResult: {
    type: 'object',
    properties: {
      totalRows: { type: 'integer' },
      createdCount: { type: 'integer' },
      errorCount: { type: 'integer' },
      created: { type: 'array', items: { type: 'object' } },
      errors: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            row: { type: 'integer' },
            errors: { type: 'array', items: { type: 'string' } },
          },
        },
      },
    },
  },
  OperationResult: { type: 'object', additionalProperties: true },
  ErrorResponse: {
    type: 'object',
    properties: {
      success: { type: 'boolean', example: false },
      statusCode: { type: 'integer' },
      message: { type: 'string' },
      error: { type: 'string' },
      timestamp: { type: 'string', format: 'date-time' },
      path: { type: 'string' },
      requestId: { type: 'string' },
    },
  },
};

function dataSchema(path: string, method: string): Schema {
  const array = (name: string): Schema => ({
    type: 'array',
    items: { $ref: `#/components/schemas/${name}` },
  });
  if (path.includes('/health/'))
    return { $ref: '#/components/schemas/HealthStatus' };
  if (/\/auth\/(register|login|firebase|refresh)$/.test(path))
    return { $ref: '#/components/schemas/TokenPair' };
  if (path.endsWith('/auth/me')) return { $ref: '#/components/schemas/User' };
  if (path.includes('/auth/'))
    return { $ref: '#/components/schemas/OperationResult' };
  if (path.endsWith('/industry-profiles')) return array('IndustryProfile');
  if (/\/businesses\/{businessId}$/.test(path))
    return { $ref: '#/components/schemas/Business' };
  if (path.endsWith('/businesses'))
    return method === 'get'
      ? array('Business')
      : { $ref: '#/components/schemas/Business' };
  if (path.includes('/categories'))
    return method === 'get'
      ? array('Category')
      : { $ref: '#/components/schemas/Category' };
  if (path.includes('/catalog') && path.includes('/variants'))
    return { $ref: '#/components/schemas/ProductVariant' };
  if (path.includes('/catalog'))
    return method === 'get' && !path.endsWith('/{id}')
      ? array('CatalogItem')
      : { $ref: '#/components/schemas/CatalogItem' };
  if (path.endsWith('/inventory')) return array('InventoryBalance');
  if (path.endsWith('/inventory/movements')) return array('InventoryMovement');
  if (path.endsWith('/inventory/adjustments'))
    return { $ref: '#/components/schemas/OperationResult' };
  if (path.includes('/customers'))
    return method === 'get' && !path.endsWith('/{id}')
      ? array('Customer')
      : { $ref: '#/components/schemas/Customer' };
  if (path.includes('/suppliers'))
    return method === 'get' && !path.endsWith('/{id}')
      ? array('Supplier')
      : { $ref: '#/components/schemas/Supplier' };
  if (path.includes('/sales'))
    return method === 'get' && !path.endsWith('/{id}')
      ? array('Sale')
      : { $ref: '#/components/schemas/Sale' };
  if (path.includes('/purchases'))
    return method === 'get' && !path.endsWith('/{id}')
      ? array('Purchase')
      : { $ref: '#/components/schemas/Purchase' };
  if (path.includes('/expense-categories'))
    return method === 'get'
      ? array('ExpenseCategory')
      : { $ref: '#/components/schemas/ExpenseCategory' };
  if (path.includes('/expenses'))
    return method === 'get'
      ? array('Expense')
      : { $ref: '#/components/schemas/Expense' };
  if (path.endsWith('/reports/dashboard'))
    return { $ref: '#/components/schemas/Dashboard' };
  if (path.endsWith('/products/import'))
    return { $ref: '#/components/schemas/ProductImportResult' };
  return { $ref: '#/components/schemas/OperationResult' };
}

export function createSwaggerDocument(app: INestApplication): OpenAPIObject {
  const config = new DocumentBuilder()
    .setTitle('Bajeti Plus Business API')
    .setDescription('Version 1 API for Bajeti Plus Business')
    .setVersion('1.0.0')
    .addBearerAuth(
      { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      'bearer',
    )
    .addServer('http://localhost:3000', 'Local development')
    .addServer('https://api.bajetiplus.com', 'Production')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  document.components ??= {};
  document.components.schemas = {
    ...document.components.schemas,
    ...responseSchemas,
  };
  for (const [path, pathItem] of Object.entries(document.paths)) {
    for (const method of ['get', 'post', 'put', 'patch', 'delete'] as const) {
      const operation = pathItem?.[method];
      if (!operation) continue;
      const status = method === 'post' ? '201' : '200';
      operation.responses[status] = {
        description: 'Successful response',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: [
                'success',
                'statusCode',
                'message',
                'data',
                'timestamp',
                'requestId',
              ],
              properties: {
                success: { type: 'boolean', enum: [true] },
                statusCode: { type: 'integer' },
                message: { type: 'string' },
                data: dataSchema(path, method),
                timestamp: { type: 'string', format: 'date-time' },
                requestId: { type: 'string' },
              },
            },
          },
        },
      };
      operation.responses['400'] = {
        description: 'Validation or business rule error',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/ErrorResponse' },
          },
        },
      };
      if (operation.security?.length)
        operation.responses['401'] = {
          description: 'Missing, invalid, or expired access token',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ErrorResponse' },
            },
          },
        };
    }
  }
  return document;
}

export function setupSwagger(app: INestApplication): void {
  SwaggerModule.setup('api/docs', app, createSwaggerDocument(app), {
    jsonDocumentUrl: 'api/docs-json',
  });
}
