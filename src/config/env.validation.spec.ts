import 'reflect-metadata';

import { validateEnvironment } from './env.validation';

const validEnvironment = {
  NODE_ENV: 'development',
  DATABASE_URL:
    'postgresql://postgres:postgres@localhost:5432/bajetiplus-business',
  JWT_ACCESS_SECRET: 'access-secret-with-at-least-32-characters',
  JWT_REFRESH_SECRET: 'refresh-secret-with-at-least-32-characters',
};

describe('validateEnvironment', () => {
  it('accepts Redis being disabled', () => {
    const result = validateEnvironment({
      ...validEnvironment,
      REDIS_URL: '',
    });

    expect(result.REDIS_URL).toBeUndefined();
  });

  it('accepts blank optional Firebase settings', () => {
    const result = validateEnvironment({
      ...validEnvironment,
      FIREBASE_PROJECT_ID: '',
      FIREBASE_CLIENT_EMAIL: '',
      FIREBASE_PRIVATE_KEY: '',
    });

    expect(result.FIREBASE_PROJECT_ID).toBeUndefined();
    expect(result.FIREBASE_CLIENT_EMAIL).toBeUndefined();
    expect(result.FIREBASE_PRIVATE_KEY).toBeUndefined();
  });

  it('rejects a non-empty invalid Firebase email', () => {
    expect(() =>
      validateEnvironment({
        ...validEnvironment,
        FIREBASE_CLIENT_EMAIL: 'not-an-email',
      }),
    ).toThrow('FIREBASE_CLIENT_EMAIL');
  });
});
