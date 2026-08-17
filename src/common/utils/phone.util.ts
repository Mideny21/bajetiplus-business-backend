export function normalizeMobile(input: string, countryCode = '255'): string {
  const digits = input.replace(/\D/g, '');
  const normalized = digits.startsWith('00') ? digits.slice(2) : digits;
  if (normalized.startsWith(countryCode)) return `+${normalized}`;
  if (normalized.startsWith('0'))
    return `+${countryCode}${normalized.slice(1)}`;
  return `+${countryCode}${normalized}`;
}
