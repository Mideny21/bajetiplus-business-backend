# Bajeti Plus Business API collections

The canonical API definition is [`openapi.json`](./openapi.json). It is generated from the compiled NestJS controllers and DTO metadata. The Bruno and Postman collections are generated from that file and currently cover every backend controller operation.

The backend also serves interactive Swagger documentation at `http://localhost:3000/api/docs` and its JSON document at `http://localhost:3000/api/docs-json` while the application is running.

## Bruno

1. Open Bruno and choose **Open Collection**.
2. Select the `api/bruno` directory.
3. Select either the `Local` or `Production` environment.
4. Set the collection ID variables (`businessId`, `id`, `variantId`, and related IDs) when using requests that need existing records.
5. Enter safe development credentials in the **Authentication → Login** request and send it.

The login response uses the global backend response envelope, so the post-response script reads `data.accessToken` and saves it to the selected environment as `accessToken`. Protected requests inherit collection-level Bearer authentication and send that saved token automatically. Registration, login, Firebase login, refresh, logout, and health requests explicitly use no Bearer authentication.

Do not commit a Bruno environment after adding credentials or persisted tokens. Create a private environment matching one of the ignored patterns in the repository `.gitignore` if values must be saved locally.

## Postman

Import these files:

- `api/postman/BajetiPlus.postman_collection.json`
- `api/postman/BajetiPlusBusiness.local.postman_environment.json`
- `api/postman/BajetiPlusBusiness.production.postman_environment.json`

Select the appropriate environment, fill request IDs as collection variables when needed, then run **Authentication → Login**. Its post-response script stores `data.accessToken` in the selected environment. The collection-level Bearer configuration uses `{{accessToken}}`; public requests override it with `No Auth`.

The committed login examples contain placeholders only. Replace them locally with a test account and never commit credentials, access tokens, refresh tokens, Firebase tokens, or API keys.

## Environments

- Local: `http://localhost:3000`
- Production: `https://api.bajetiplus.com`

Both committed templates define `baseUrl` and an empty `accessToken`. Collection request paths include the backend's configured `/api/v1` prefix.

## Updating the collections

After changing controllers or DTOs, run:

```bash
pnpm api:generate
pnpm api:validate
```

`api:generate` rebuilds the application, regenerates `api/openapi.json` from NestJS Swagger metadata, and recreates both client collections. `api:validate` checks operation-count parity, login token extraction, inherited Bearer authentication, and committed environment templates.

Generated request files should not be edited independently because regeneration replaces them. Add API descriptions and DTO metadata in the NestJS source or update the generation scripts when collection behavior needs to change.
