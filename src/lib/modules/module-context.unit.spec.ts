import { describe, expect, it } from 'vitest';

// Test the module context module can be imported without errors
// Note: The storage helper functions (getStoredModule, setStoredModule) are not exported,
// so we test the behavior through the exported functions and types.
// Full hook testing requires browser tests which are out of scope for this fix.

describe('module-context', () => {
  it('exports ModuleProvider and hooks', async () => {
    const moduleContext = await import('./module-context');

    expect(moduleContext.ModuleProvider).toBeDefined();
    expect(typeof moduleContext.ModuleProvider).toBe('function');

    expect(moduleContext.useModule).toBeDefined();
    expect(typeof moduleContext.useModule).toBe('function');

    expect(moduleContext.useModuleConfig).toBeDefined();
    expect(typeof moduleContext.useModuleConfig).toBe('function');
  });
});
