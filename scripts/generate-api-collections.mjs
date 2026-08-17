import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';

const api = JSON.parse(await readFile('api/openapi.json', 'utf8'));
const methods = ['get', 'post', 'put', 'patch', 'delete'];
const publicOperations = new Set([
  'HealthController_liveness',
  'HealthController_readiness',
  'AuthController_register',
  'AuthController_login',
  'AuthController_firebase',
  'AuthController_refresh',
  'AuthController_logout',
]);
const variableDefaults = {
  businessId: '',
  id: '',
  variantId: '',
  catalogItemId: '',
  customerId: '',
  supplierId: '',
  categoryId: '',
};

function resolve(schema) {
  if (!schema) return {};
  if (schema.$ref)
    return api.components.schemas[schema.$ref.split('/').pop()] ?? {};
  return schema;
}

function sampleValue(schema, property = '') {
  schema = resolve(schema);
  if (schema.example !== undefined) return schema.example;
  if (schema.enum?.length) return schema.enum[0];
  const named = {
    email: 'user@example.com',
    mobile: '255712345678',
    phone: '255712345678',
    password: 'change-me',
    identifier: 'user@example.com',
    refreshToken: '',
    idToken: '',
    name: 'Example',
    industry: 'clothing-fashion',
    currency: 'TZS',
    description: 'Example note',
    notes: 'Example note',
    sku: 'SKU-001',
    categoryId: '{{categoryId}}',
    catalogItemId: '{{catalogItemId}}',
    customerId: '{{customerId}}',
    supplierId: '{{supplierId}}',
    branchId: '',
    variantId: '{{variantId}}',
    sellingPrice: 1500,
    costPrice: 1000,
    lowStockThreshold: 2,
    amount: 5000,
    quantity: 1,
    costPerItem: 1000,
    unitPrice: 1500,
    amountPaid: 0,
    paymentMethod: 'CASH',
    operation: 'OPENING',
    type: 'PRODUCT',
    attributes: { Size: 'M', Color: 'Black' },
  };
  if (Object.hasOwn(named, property)) return named[property];
  if (schema.type === 'array') return [sampleValue(schema.items, property)];
  if (schema.type === 'object' || schema.properties) {
    const required = new Set(schema.required ?? []);
    return Object.fromEntries(
      Object.entries(schema.properties ?? {})
        .filter(([key]) => required.has(key))
        .map(([key, value]) => [key, sampleValue(value, key)]),
    );
  }
  if (schema.type === 'boolean') return false;
  if (schema.type === 'number' || schema.type === 'integer') return 1;
  return '';
}

function requestBody(operation) {
  const content = operation.requestBody?.content;
  const json = content?.['application/json'];
  return json ? sampleValue(json.schema) : undefined;
}

function title(operation) {
  const method = operation.operationId.split('_').pop();
  return method
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/^./, (letter) => letter.toUpperCase());
}

function slug(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function routeUrl(openApiPath) {
  return openApiPath.replaceAll(/{([^}]+)}/g, '{{$1}}');
}

const operations = [];
for (const [openApiPath, pathItem] of Object.entries(api.paths)) {
  for (const method of methods) {
    const operation = pathItem[method];
    if (!operation) continue;
    operations.push({
      openApiPath,
      route: routeUrl(openApiPath),
      method,
      operation,
      folder: operation.tags?.[0] ?? 'Other',
      public: publicOperations.has(operation.operationId),
    });
  }
}

await rm('api/bruno', { recursive: true, force: true });
await rm('api/postman', { recursive: true, force: true });
await mkdir('api/bruno/environments', { recursive: true });
await mkdir('api/postman', { recursive: true });

await writeFile(
  'api/bruno/bruno.json',
  `${JSON.stringify({ version: '1', name: 'Bajeti Plus Business API', type: 'collection', ignore: ['node_modules', '.git'] }, null, 2)}\n`,
);
await writeFile(
  'api/bruno/collection.bru',
  `auth {\n  mode: bearer\n}\n\nauth:bearer {\n  token: {{accessToken}}\n}\n\nvars:pre-request {\n  businessId:\n  id:\n  variantId:\n  catalogItemId:\n  customerId:\n  supplierId:\n  categoryId:\n}\n`,
);
await writeFile(
  'api/bruno/environments/Local.bru',
  `vars {\n  baseUrl: http://localhost:3000\n  accessToken:\n}\n`,
);
await writeFile(
  'api/bruno/environments/Production.bru',
  `vars {\n  baseUrl: https://api.bajetiplus.com\n  accessToken:\n}\n`,
);

const postmanFolders = new Map();
const folderNames = [...new Set(operations.map((entry) => entry.folder))];
let requestCount = 0;
for (const [folderIndex, folder] of folderNames.entries()) {
  const folderPath = path.join(
    'api/bruno',
    `${String(folderIndex + 1).padStart(2, '0')}-${slug(folder)}`,
  );
  await mkdir(folderPath, { recursive: true });
  await writeFile(
    path.join(folderPath, 'folder.bru'),
    `meta {\n  name: ${folder}\n  seq: ${folderIndex + 1}\n}\n`,
  );
  const folderItems = [];
  const entries = operations.filter((entry) => entry.folder === folder);
  for (const [index, entry] of entries.entries()) {
    const name = title(entry.operation);
    const query = (entry.operation.parameters ?? []).filter(
      (parameter) => parameter.in === 'query',
    );
    const body = requestBody(entry.operation);
    const isUpload =
      entry.operation.requestBody?.content?.['multipart/form-data'];
    const login = entry.operation.operationId === 'AuthController_login';
    const authMode = entry.public ? 'none' : 'inherit';
    let bru = `meta {\n  name: ${name}\n  type: http\n  seq: ${index + 1}\n}\n\n${entry.method} {\n  url: {{baseUrl}}${entry.route}\n  body: ${isUpload ? 'multipartForm' : body ? 'json' : 'none'}\n  auth: ${authMode}\n}\n`;
    if (query.length)
      bru += `\nparams:query {\n${query.map((parameter) => `  ~${parameter.name}: ${parameter.schema?.enum?.[0] ?? ''}`).join('\n')}\n}\n`;
    if (body)
      bru += `\nbody:json {\n${JSON.stringify(body, null, 2)
        .slice(1, -1)
        .split('\n')
        .map((line) => `  ${line}`)
        .join('\n')}\n}\n`;
    if (isUpload) bru += `\nbody:multipart-form {\n  file: @file()\n}\n`;
    if (login)
      bru += `\nscript:post-response {\n  const body = res.getBody();\n  const token = body.data?.accessToken;\n\n  if (!token) {\n    throw new Error("Login response does not contain an access token");\n  }\n\n  bru.setEnvVar("accessToken", token);\n}\n`;
    await writeFile(
      path.join(
        folderPath,
        `${String(index + 1).padStart(2, '0')}-${slug(name)}.bru`,
      ),
      bru,
    );

    const queryString = query.length
      ? `?${query.map((parameter) => `${parameter.name}=${parameter.schema?.enum?.[0] ?? ''}`).join('&')}`
      : '';
    const postmanRequest = {
      method: entry.method.toUpperCase(),
      header: body
        ? [{ key: 'Content-Type', value: 'application/json', type: 'text' }]
        : [],
      auth: entry.public ? { type: 'noauth' } : undefined,
      url: {
        raw: `{{baseUrl}}${entry.route}${queryString}`,
        host: ['{{baseUrl}}'],
        path: entry.route.split('/').filter(Boolean),
        query: query.map((parameter) => ({
          key: parameter.name,
          value: String(parameter.schema?.enum?.[0] ?? ''),
          disabled: true,
        })),
      },
    };
    if (body)
      postmanRequest.body = {
        mode: 'raw',
        raw: JSON.stringify(body, null, 2),
        options: { raw: { language: 'json' } },
      };
    if (isUpload) {
      postmanRequest.header = [];
      postmanRequest.body = {
        mode: 'formdata',
        formdata: [{ key: 'file', type: 'file', src: [] }],
      };
    }
    const item = { name, request: postmanRequest, response: [] };
    if (login)
      item.event = [
        {
          listen: 'test',
          script: {
            type: 'text/javascript',
            exec: [
              'const body = pm.response.json();',
              'const token = body.data?.accessToken;',
              '',
              'if (!token) {',
              '  throw new Error("Login response does not contain an access token");',
              '}',
              '',
              'pm.environment.set("accessToken", token);',
            ],
          },
        },
      ];
    folderItems.push(item);
    requestCount++;
  }
  postmanFolders.set(folder, folderItems);
}

const collection = {
  info: {
    _postman_id: '7b38a13e-9663-4f76-9acb-1b0a971e898f',
    name: 'Bajeti Plus Business API',
    description: 'Generated from api/openapi.json. Do not add secrets.',
    schema:
      'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
  },
  auth: {
    type: 'bearer',
    bearer: [{ key: 'token', value: '{{accessToken}}', type: 'string' }],
  },
  variable: Object.entries(variableDefaults).map(([key, value]) => ({
    key,
    value,
    type: 'string',
  })),
  item: folderNames.map((folder) => ({
    name: folder,
    item: postmanFolders.get(folder),
  })),
};
await writeFile(
  'api/postman/BajetiPlus.postman_collection.json',
  `${JSON.stringify(collection, null, 2)}\n`,
);

function postmanEnvironment(name, baseUrl, id) {
  return {
    id,
    name,
    values: [
      { key: 'baseUrl', value: baseUrl, type: 'default', enabled: true },
      { key: 'accessToken', value: '', type: 'secret', enabled: true },
    ],
    _postman_variable_scope: 'environment',
    _postman_exported_using: 'Bajeti Plus Business API generator',
  };
}
await writeFile(
  'api/postman/BajetiPlusBusiness.local.postman_environment.json',
  `${JSON.stringify(postmanEnvironment('Bajeti Plus Business - Local', 'http://localhost:3000', '1a254944-d9a8-43db-a88e-18f445c50625'), null, 2)}\n`,
);
await writeFile(
  'api/postman/BajetiPlusBusiness.production.postman_environment.json',
  `${JSON.stringify(postmanEnvironment('Bajeti Plus Business - Production', 'https://api.bajetiplus.com', 'cf46d730-faad-42b1-ac42-cf155281ac52'), null, 2)}\n`,
);

if (requestCount !== operations.length)
  throw new Error(
    `Generated ${requestCount} requests for ${operations.length} OpenAPI operations`,
  );
console.log(
  `Generated ${requestCount} Bruno requests and ${requestCount} Postman requests from api/openapi.json.`,
);
