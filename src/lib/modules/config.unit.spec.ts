import { describe, expect, it } from 'vitest';

import { getModuleFromPath } from './config';

describe('getModuleFromPath', () => {
  it.each([
    ['/', null],
    ['/treasury', 'treasury'],
    ['/treasury/', 'treasury'],
    ['/treasury/overview', 'treasury'],
    ['/compliance/monitoring', 'compliance'],
    ['/global/users', 'global'],
    ['/unknown', null],
    ['/treasuryx', null], // Should NOT match treasury
    ['/globalx/users', null], // Should NOT match global
  ])('getModuleFromPath(%s) should return %s', (pathname, expected) => {
    expect(getModuleFromPath(pathname)).toBe(expected);
  });
});
