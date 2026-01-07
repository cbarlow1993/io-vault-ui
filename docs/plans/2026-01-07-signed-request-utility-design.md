# Signed Request Utility Design

## Overview

Replace the deprecated `signedHttpLambdaRequest` from `@iofinnet/io-core-cldsvc-sdk` with a lightweight utility for making AWS Signature v4 signed HTTP requests to Lambda and Lambda URLs.

## Motivation

- The `signedHttpLambdaRequest` function is deprecated
- The replacement in `@iofinnet/http-sdk` requires `@aws-lambda-powertools/logger` which is incompatible with this codebase's simple logger
- A focused utility using `aws4` directly is lighter and tailored to our needs

## Interface

```typescript
export type SignedRequestOptions<TBody = unknown> = {
  url: string;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: TBody;
  headers?: Record<string, string>;
  service?: string;   // Defaults to 'lambda'
  region?: string;    // Defaults to 'eu-west-1'
  retries?: number;   // Defaults to 3
  retryDelay?: number; // Defaults to 200ms
};

export class SignedRequestError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public responseBody: unknown
  ) {
    super(message);
    this.name = 'SignedRequestError';
  }
}

export async function signedRequest<TResponse, TBody = unknown>(
  options: SignedRequestOptions<TBody>
): Promise<TResponse>;
```

## Implementation Details

### Dependencies

- `@aws-sdk/credential-providers` - Credential resolution via `fromNodeProviderChain()`
- `aws4` - AWS Signature v4 signing
- Native `fetch` - HTTP client (Node 18+)

### Credential Resolution

Uses `fromNodeProviderChain()` which automatically resolves credentials from:
1. Environment variables (`AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`)
2. Shared credentials file (`~/.aws/credentials`)
3. IAM roles (EC2, ECS, Lambda)

Credentials are cached and reused until expiry.

### Signing Flow

1. Parse URL to extract host and path
2. Resolve AWS credentials
3. Build request options with method, headers, body
4. Sign with `aws4.sign()`
5. Execute fetch with signed headers
6. Parse JSON response

### Retry Strategy

- Retry on: network errors, 5xx responses
- No retry on: 4xx responses (client errors)
- Default: 3 retries with 200ms delay
- Simple fixed delay (no exponential backoff)

### Error Handling

- Non-2xx responses throw `SignedRequestError` with status code and response body
- Network errors bubble up as-is
- No silent failures - caller always knows outcome

## File Location

```
src/lib/signed-request.ts
```

## Migration

Replace usages of:
```typescript
import { signedHttpLambdaRequest } from '@iofinnet/io-core-cldsvc-sdk';

await signedHttpLambdaRequest<Response, Body>(
  {
    host: INTERNAL_TRANSACTION_ROUTER_URL,
    endpoint: '/sign-request',
    method: 'POST',
    optionalParams: { data: params },
  },
  { retryConfig: { retries: 3, retryDelay: () => 200 } }
);
```

With:
```typescript
import { signedRequest } from '@/src/lib/signed-request.js';

await signedRequest<Response, Body>({
  url: `${INTERNAL_TRANSACTION_ROUTER_URL}/sign-request`,
  method: 'POST',
  body: params,
  retries: 3,
  retryDelay: 200,
});
```

## Testing

- Unit tests with mocked fetch and credential provider
- Test retry behavior on 5xx
- Test error handling on 4xx
- Test credential resolution
