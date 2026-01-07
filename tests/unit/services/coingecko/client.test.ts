import { describe, it, expect, vi, beforeEach } from 'vitest';

// Use vi.hoisted to create mocks that can be referenced in vi.mock factories
const { MockCoingecko } = vi.hoisted(() => {
  const MockCoingecko = vi.fn(function (this: { _options: unknown }, options: unknown) {
    this._options = options;
  });
  return { MockCoingecko };
});

// Mock the config before importing
vi.mock('@/src/lib/config.js', () => ({
  config: {
    apis: {
      coinGecko: {
        apiKey: 'test-pro-api-key',
        requestTimeout: 10000,
      },
    },
  },
}));

// Mock the SDK with a class constructor
vi.mock('@coingecko/coingecko-typescript', () => {
  return {
    default: MockCoingecko,
  };
});

import { getCoinGeckoClient, resetCoinGeckoClient } from '@/src/services/coingecko/client.js';

describe('CoinGecko Client', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetCoinGeckoClient();
  });

  it('should create client with pro API key when configured', () => {
    const client = getCoinGeckoClient();

    expect(MockCoingecko).toHaveBeenCalledWith({
      proAPIKey: 'test-pro-api-key',
      timeout: 10000,
    });
    expect(client).toBeDefined();
  });

  it('should return the same instance on subsequent calls (singleton)', () => {
    const client1 = getCoinGeckoClient();
    const client2 = getCoinGeckoClient();

    expect(client1).toBe(client2);
    expect(MockCoingecko).toHaveBeenCalledTimes(1);
  });
});
