import { describe, expect, it, vi, beforeEach } from 'vitest';

// Mock credential provider
vi.mock('@aws-sdk/credential-providers', () => ({
  fromNodeProviderChain: vi.fn(() =>
    vi.fn().mockResolvedValue({
      accessKeyId: 'test-access-key',
      secretAccessKey: 'test-secret-key',
      sessionToken: 'test-session-token',
    })
  ),
}));

// Mock aws4
vi.mock('aws4', () => ({
  default: {
    sign: vi.fn((options) => {
      options.headers = {
        ...options.headers,
        Authorization: 'AWS4-HMAC-SHA256 Credential=test...',
        'X-Amz-Date': '20260107T120000Z',
      };
      return options;
    }),
  },
}));

// Mock global fetch
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

import { signedRequest, SignedRequestError } from '@/src/lib/signed-request.js';

describe('signedRequest', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('makes a signed POST request and returns JSON response', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ id: 'test-123' }),
    });

    const result = await signedRequest<{ id: string }>({
      url: 'https://example.lambda-url.eu-west-1.on.aws/endpoint',
      body: { foo: 'bar' },
    });

    expect(result).toEqual({ id: 'test-123' });
    expect(mockFetch).toHaveBeenCalledWith(
      'https://example.lambda-url.eu-west-1.on.aws/endpoint',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ foo: 'bar' }),
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
          Authorization: expect.stringContaining('AWS4-HMAC-SHA256'),
        }),
      })
    );
  });

  it('makes a GET request without body', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ data: [] }),
    });

    const result = await signedRequest<{ data: string[] }>({
      url: 'https://example.lambda-url.eu-west-1.on.aws/list',
      method: 'GET',
    });

    expect(result).toEqual({ data: [] });
    expect(mockFetch).toHaveBeenCalledWith(
      'https://example.lambda-url.eu-west-1.on.aws/list',
      expect.objectContaining({
        method: 'GET',
        body: undefined,
      })
    );
  });

  it('includes custom headers in the request', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({}),
    });

    await signedRequest({
      url: 'https://example.lambda-url.eu-west-1.on.aws/endpoint',
      headers: { 'X-Custom-Header': 'custom-value' },
    });

    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({
          'X-Custom-Header': 'custom-value',
        }),
      })
    );
  });

  it('throws SignedRequestError on 4xx response', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      text: () => Promise.resolve(JSON.stringify({ error: 'Bad request' })),
    });

    try {
      await signedRequest({
        url: 'https://example.lambda-url.eu-west-1.on.aws/endpoint',
      });
      expect.fail('Should have thrown');
    } catch (error) {
      expect(error).toBeInstanceOf(SignedRequestError);
      expect(error).toMatchObject({
        statusCode: 400,
        responseBody: { error: 'Bad request' },
      });
    }
  });

  it('does not retry on 4xx errors', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 404,
      text: () => Promise.resolve('Not found'),
    });

    await expect(
      signedRequest({
        url: 'https://example.lambda-url.eu-west-1.on.aws/endpoint',
        retries: 3,
      })
    ).rejects.toThrow(SignedRequestError);

    // Should only be called once - no retries for 4xx
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('retries on 5xx errors', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: () => Promise.resolve('Internal server error'),
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 503,
        text: () => Promise.resolve('Service unavailable'),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });

    const result = await signedRequest<{ success: boolean }>({
      url: 'https://example.lambda-url.eu-west-1.on.aws/endpoint',
      retries: 3,
      retryDelay: 10, // Fast retries for test
    });

    expect(result).toEqual({ success: true });
    expect(mockFetch).toHaveBeenCalledTimes(3);
  });

  it('throws after exhausting retries on 5xx', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
      text: () => Promise.resolve('Internal server error'),
    });

    await expect(
      signedRequest({
        url: 'https://example.lambda-url.eu-west-1.on.aws/endpoint',
        retries: 2,
        retryDelay: 10,
      })
    ).rejects.toThrow(SignedRequestError);

    // Initial attempt + 2 retries = 3 calls
    expect(mockFetch).toHaveBeenCalledTimes(3);
  });

  it('retries on network errors', async () => {
    mockFetch
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ recovered: true }),
      });

    const result = await signedRequest<{ recovered: boolean }>({
      url: 'https://example.lambda-url.eu-west-1.on.aws/endpoint',
      retries: 1,
      retryDelay: 10,
    });

    expect(result).toEqual({ recovered: true });
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it('throws network error after exhausting retries', async () => {
    mockFetch.mockRejectedValue(new Error('Network error'));

    await expect(
      signedRequest({
        url: 'https://example.lambda-url.eu-west-1.on.aws/endpoint',
        retries: 1,
        retryDelay: 10,
      })
    ).rejects.toThrow('Network error');

    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it('handles non-JSON error responses', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      text: () => Promise.resolve('Plain text error'),
    });

    await expect(
      signedRequest({
        url: 'https://example.lambda-url.eu-west-1.on.aws/endpoint',
      })
    ).rejects.toMatchObject({
      statusCode: 400,
      responseBody: 'Plain text error',
    });
  });

  it('uses default values for optional parameters', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({}),
    });

    await signedRequest({
      url: 'https://example.lambda-url.eu-west-1.on.aws/endpoint',
    });

    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        method: 'POST',
      })
    );
  });
});

describe('SignedRequestError', () => {
  it('has correct properties', () => {
    const error = new SignedRequestError('Test error', 404, { detail: 'Not found' });

    expect(error.name).toBe('SignedRequestError');
    expect(error.message).toBe('Test error');
    expect(error.statusCode).toBe(404);
    expect(error.responseBody).toEqual({ detail: 'Not found' });
  });

  it('is instanceof Error', () => {
    const error = new SignedRequestError('Test', 500, null);
    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(SignedRequestError);
  });
});
