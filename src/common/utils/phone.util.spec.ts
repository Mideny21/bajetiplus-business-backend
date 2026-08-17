import { normalizeMobile } from './phone.util';

describe('normalizeMobile', () => {
  it.each([
    ['0712345678', '+255712345678'],
    ['+255 712 345 678', '+255712345678'],
    ['00255-712-345-678', '+255712345678'],
  ])('normalizes %s', (input, expected) => {
    expect(normalizeMobile(input)).toBe(expected);
  });
});
