# NestJS Backend Starter

A production-minded NestJS 11 template with strict TypeScript, Prisma 7 and PostgreSQL, Redis, JWT authentication, optional Firebase Admin authentication, Docker, GitHub Actions, and PM2. It intentionally contains no product-domain modules.

## Use this template

After this repository is published and marked as a GitHub template, choose **Use this template → Create a new repository**. Clone the generated repository, copy the environment file, and change `APP_NAME` before starting services.

Requirements: Node.js 22+, pnpm 10+, Docker, and Docker Compose.

```bash
cp .env.example .env
pnpm install
pnpm docker:up
pnpm db:migrate:dev
pnpm db:seed
pnpm start:dev
```

The API is available under `http://localhost:3000/api/v1`. Do not use the example JWT secrets outside local development.

## Configuration

Every supported variable is documented in `.env.example`; configuration is validated before startup. Required settings include PostgreSQL and Redis URLs plus separate access and refresh JWT secrets of at least 32 characters. `CORS_ORIGINS` is a comma-separated allowlist. `TRUST_PROXY` is the number of trusted reverse-proxy hops and should match your deployment topology. In development only, `DEV_RESPONSE_DELAY_MS` adds a fixed response delay (500 ms by default) so loading states are easy to exercise; set it to `0` to disable it.

Phone numbers are normalized in `src/common/utils/phone.util.ts`. The default country code is `255` (Tanzania); set `PHONE_DEFAULT_COUNTRY_CODE` or replace the utility for another market.

## Authentication

| Method | Endpoint                  | Purpose                                      |
| ------ | ------------------------- | -------------------------------------------- |
| POST   | `/api/v1/auth/register`   | Register with email, mobile, or both         |
| POST   | `/api/v1/auth/login`      | Log in using email or mobile                 |
| POST   | `/api/v1/auth/firebase`   | Exchange a Firebase ID token when configured |
| POST   | `/api/v1/auth/refresh`    | Rotate an unexpired refresh token            |
| POST   | `/api/v1/auth/logout`     | Revoke one refresh session                   |
| POST   | `/api/v1/auth/logout-all` | Revoke all sessions for the bearer user      |
| GET    | `/api/v1/auth/me`         | Return the bearer user                       |

Access and refresh tokens are returned in JSON for API and mobile clients. Store refresh tokens in platform-secure storage, never logs or ordinary browser local storage. Refresh tokens are hashed in PostgreSQL, rotated on use, and grouped into families; reuse of a rotated token revokes its active family.

Use `JwtAuthGuard`, `@CurrentUser()`, `@Roles(Role.ADMIN)`, and `RolesGuard` when protecting project resources.

## Firebase (optional)

The server starts without Firebase settings. To enable Firebase login, set all of `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, and `FIREBASE_PRIVATE_KEY`. Encode line breaks in the private key as `\n`. The Firebase endpoint returns `503` while the integration is disabled.

## Responses and health

Successful controller results are wrapped globally:

```json
{
  "success": true,
  "statusCode": 200,
  "message": "OK",
  "data": {},
  "timestamp": "2026-08-02T00:00:00.000Z",
  "requestId": "request-or-generated-uuid"
}
```

Errors contain `success`, `statusCode`, `message`, `error`, `path`, `timestamp`, and `requestId`. Production responses never expose stack traces or raw database errors. Send `X-Request-Id` to propagate a caller ID; otherwise one is generated. Structured logs recursively redact password, token, cookie, authorization, Firebase, and secret fields.

- `GET /api/v1/health/live` confirms the process is alive.
- `GET /api/v1/health/ready` checks PostgreSQL and Redis and returns a failing status when either is unavailable.

## Database, Docker, and tests

```bash
pnpm prisma:validate
pnpm db:migrate:dev       # create/apply a development migration
pnpm db:migrate:deploy    # apply committed migrations in deployment
pnpm db:seed
pnpm docker:down

pnpm format:check
pnpm lint
pnpm build
pnpm test
```

For isolated e2e infrastructure:

```bash
cp .env.test.example .env.test
pnpm docker:test:up
pnpm db:reset:test
pnpm test:e2e
pnpm docker:test:down
```

The reset script refuses to run unless `NODE_ENV=test` and the database URL clearly identifies a test database. Compose project names derive from `APP_NAME`; generated repositories do not need hardcoded container renaming.

## Add the first feature

Generate a complete Nest resource under `src/modules/` with:

```bash
pnpm generate:resource modules/projects
```

The interactive Nest schematic creates the module, controller, service, DTOs,
and tests you select, then imports the generated module into `AppModule`
automatically.

Extend `prisma/schema.prisma`, run `pnpm db:migrate:dev --name add-projects`, and add colocated `*.spec.ts` tests. Infrastructure should remain in `src/core/`, database code in `src/database/`, and reusable request concerns in `src/common/`.

## Production and PM2

Keep secrets in the deployment environment, not this repository. Safe deployment ordering is deliberate:

```bash
pnpm deploy:prepare  # locked install and build; does not change the database
pnpm deploy:migrate  # apply committed migrations once
pnpm deploy:prod     # start/reload PM2 only after migration succeeds
```

`ecosystem.config.cjs` reads `APP_NAME`, `PORT`, `PM2_INSTANCES`, and `PM2_MAX_MEMORY`. The application handles shutdown signals and closes PostgreSQL and Redis cleanly. Run migrations as a single release task before reloading application instances; do not run `prisma migrate dev` in production.

## Publish as `Mideny21/nestjs-backend-starter`

1. On GitHub, create a **public** repository named `nestjs-backend-starter` under `Mideny21`. Do not initialize it with a README, license, or `.gitignore`.
2. From this directory, run:

   ```bash
   git remote add origin https://github.com/Mideny21/nestjs-backend-starter.git
   git push -u origin main
   ```

3. Open **Settings → General** and enable **Template repository**.
4. For future projects, choose **Use this template** on the repository page.

## License

MIT © Mideny21
