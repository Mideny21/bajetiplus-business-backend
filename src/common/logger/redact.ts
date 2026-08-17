const sensitiveKey = /password|token|authorization|cookie|secret|firebase/i;

export function redactSensitive(value: unknown): unknown {
  return redact(value, new WeakSet<object>());
}

function redact(value: unknown, seen: WeakSet<object>): unknown {
  if (!value || typeof value !== 'object' || value instanceof Error)
    return value;

  if (seen.has(value)) return '[Circular]';

  if (Array.isArray(value)) {
    seen.add(value);
    return value.map((item) => redact(item, seen));
  }

  const prototype = Object.getPrototypeOf(value) as object | null;
  if (prototype !== Object.prototype && prototype !== null) return value;

  seen.add(value);
  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [
      key,
      sensitiveKey.test(key) ? '[REDACTED]' : redact(item, seen),
    ]),
  );
}
