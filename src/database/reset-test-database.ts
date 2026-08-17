import 'dotenv/config';
import { execFileSync } from 'node:child_process';

if (process.env.NODE_ENV !== 'test') {
  throw new Error('Database reset is only allowed when NODE_ENV=test');
}
if (
  !process.env.DATABASE_URL ||
  !/(_test|test_)/i.test(process.env.DATABASE_URL)
) {
  throw new Error(
    'Refusing to reset a database whose URL is not clearly test-only',
  );
}

execFileSync(
  'pnpm',
  ['exec', 'prisma', 'migrate', 'reset', '--force', '--skip-seed'],
  {
    stdio: 'inherit',
  },
);
