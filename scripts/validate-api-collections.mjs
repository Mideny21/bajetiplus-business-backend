import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import SwaggerParser from '@apidevtools/swagger-parser';

const api = JSON.parse(await readFile('api/openapi.json', 'utf8'));
await SwaggerParser.validate(api);
const postman = JSON.parse(
  await readFile('api/postman/BajetiPlus.postman_collection.json', 'utf8'),
);
const methods = ['get', 'post', 'put', 'patch', 'delete'];
const operations = Object.entries(api.paths).flatMap(([route, item]) =>
  methods
    .filter((method) => item[method])
    .map((method) => ({ route, method, operation: item[method] })),
);

function flattenPostman(items) {
  return items.flatMap((item) =>
    item.item ? flattenPostman(item.item) : [item],
  );
}

async function bruFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map((entry) =>
      entry.isDirectory()
        ? bruFiles(path.join(directory, entry.name))
        : [path.join(directory, entry.name)],
    ),
  );
  return nested
    .flat()
    .filter(
      (file) =>
        file.endsWith('.bru') &&
        !file.endsWith('collection.bru') &&
        !file.endsWith('folder.bru') &&
        !file.includes('/environments/'),
    );
}

const postmanRequests = flattenPostman(postman.item);
const brunoRequests = await bruFiles('api/bruno');
if (postmanRequests.length !== operations.length)
  throw new Error(
    `Postman has ${postmanRequests.length} requests; OpenAPI has ${operations.length} operations`,
  );
if (brunoRequests.length !== operations.length)
  throw new Error(
    `Bruno has ${brunoRequests.length} requests; OpenAPI has ${operations.length} operations`,
  );

const expectedRoutes = new Set(
  operations.map(
    ({ route, method }) =>
      `${method.toUpperCase()} ${route.replaceAll(/{([^}]+)}/g, '{{$1}}')}`,
  ),
);
const postmanRoutes = new Set(
  postmanRequests.map(
    (item) =>
      `${item.request.method} ${item.request.url.raw.replace('{{baseUrl}}', '').split('?')[0]}`,
  ),
);
const brunoRoutes = new Set();
for (const file of brunoRequests) {
  const content = await readFile(file, 'utf8');
  const method = content
    .match(/\n(get|post|put|patch|delete) \{/i)?.[1]
    ?.toUpperCase();
  const route = content.match(/\n\s*url: \{\{baseUrl}}([^\n]+)/)?.[1];
  if (method && route) brunoRoutes.add(`${method} ${route}`);
}
for (const expected of expectedRoutes) {
  if (!postmanRoutes.has(expected))
    throw new Error(`Postman is missing ${expected}`);
  if (!brunoRoutes.has(expected))
    throw new Error(`Bruno is missing ${expected}`);
}

const loginPostman = postmanRequests.find((item) => item.name === 'Login');
if (
  !loginPostman?.event?.[0]?.script?.exec
    ?.join('\n')
    .includes('body.data?.accessToken')
)
  throw new Error(
    'Postman login token script is missing or uses the wrong response path',
  );
const loginBruPath = brunoRequests.find((file) =>
  file.endsWith('/02-login.bru'),
);
const loginBru = loginBruPath ? await readFile(loginBruPath, 'utf8') : '';
if (
  !loginBru.includes('body.data?.accessToken') ||
  !loginBru.includes('bru.setEnvVar("accessToken", token)')
)
  throw new Error(
    'Bruno login token script is missing or uses the wrong response path',
  );

const mePostman = postmanRequests.find((item) => item.name === 'Me');
if (mePostman?.request.auth)
  throw new Error(
    'Protected Postman request must inherit collection bearer authentication',
  );
const collectionBru = await readFile('api/bruno/collection.bru', 'utf8');
const meBruPath = brunoRequests.find((file) => file.endsWith('/07-me.bru'));
const meBru = meBruPath ? await readFile(meBruPath, 'utf8') : '';
if (
  !collectionBru.includes('token: {{accessToken}}') ||
  !meBru.includes('auth: inherit')
)
  throw new Error(
    'Protected Bruno request does not inherit collection bearer authentication',
  );

for (const environment of [
  'api/bruno/environments/Local.bru',
  'api/bruno/environments/Production.bru',
  'api/postman/BajetiPlusBusiness.local.postman_environment.json',
  'api/postman/BajetiPlusBusiness.production.postman_environment.json',
]) {
  const content = await readFile(environment, 'utf8');
  if (
    !content.includes('accessToken') ||
    /accessToken[^\n]{0,80}(eyJ|Bearer\s+)/i.test(content)
  )
    throw new Error(`Potential committed token in ${environment}`);
}

console.log(
  `Validated ${operations.length} OpenAPI operations, ${brunoRequests.length} Bruno requests, and ${postmanRequests.length} Postman requests.`,
);
console.log(
  'Validated login token extraction and inherited Bearer authentication on GET /auth/me.',
);
