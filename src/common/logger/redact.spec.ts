import { redactSensitive } from './redact';

describe('redactSensitive', () => {
  it('redacts sensitive values recursively', () => {
    expect(
      redactSensitive({
        email: 'safe@example.com',
        password: 'x',
        nested: { authorization: 'Bearer x' },
      }),
    ).toEqual({
      email: 'safe@example.com',
      password: '[REDACTED]',
      nested: { authorization: '[REDACTED]' },
    });
  });

  it('handles circular values without traversing Error instances', () => {
    const value: { password: string; self?: unknown; error: Error } = {
      password: 'x',
      error: new Error('safe to serialize with Pino'),
    };
    value.self = value;

    expect(redactSensitive(value)).toEqual({
      password: '[REDACTED]',
      error: value.error,
      self: '[Circular]',
    });
  });
});
