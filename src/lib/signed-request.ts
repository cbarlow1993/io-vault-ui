import { fromNodeProviderChain } from '@aws-sdk/credential-providers';
import aws4 from 'aws4';

export type SignedRequestOptions<TBody = unknown> = {
  url: string;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: TBody;
  headers?: Record<string, string>;
  service?: string;
  region?: string;
  retries?: number;
  retryDelay?: number;
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

const DEFAULT_SERVICE = 'lambda';
const DEFAULT_REGION = 'eu-west-1';
const DEFAULT_RETRIES = 3;
const DEFAULT_RETRY_DELAY = 200;

const credentialProvider = fromNodeProviderChain();

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryable(statusCode: number): boolean {
  return statusCode >= 500 && statusCode < 600;
}

export async function signedRequest<TResponse, TBody = unknown>(
  options: SignedRequestOptions<TBody>
): Promise<TResponse> {
  const {
    url,
    method = 'POST',
    body,
    headers: customHeaders = {},
    service = DEFAULT_SERVICE,
    region = DEFAULT_REGION,
    retries = DEFAULT_RETRIES,
    retryDelay = DEFAULT_RETRY_DELAY,
  } = options;

  const parsedUrl = new URL(url);
  const credentials = await credentialProvider();

  const bodyString = body ? JSON.stringify(body) : undefined;

  const requestOptions = {
    host: parsedUrl.host,
    path: parsedUrl.pathname + parsedUrl.search,
    method,
    service,
    region,
    headers: {
      'Content-Type': 'application/json',
      ...customHeaders,
    },
    body: bodyString,
  };

  aws4.sign(requestOptions, {
    accessKeyId: credentials.accessKeyId,
    secretAccessKey: credentials.secretAccessKey,
    sessionToken: credentials.sessionToken,
  });

  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= retries; attempt++) {
    if (attempt > 0) {
      await sleep(retryDelay);
    }

    try {
      const response = await fetch(url, {
        method: requestOptions.method,
        headers: requestOptions.headers as Record<string, string>,
        body: bodyString,
      });

      if (!response.ok) {
        const responseBody = await response.text();
        let parsedBody: unknown;
        try {
          parsedBody = JSON.parse(responseBody);
        } catch {
          parsedBody = responseBody;
        }

        if (isRetryable(response.status) && attempt < retries) {
          lastError = new SignedRequestError(
            `Request failed with status ${response.status}`,
            response.status,
            parsedBody
          );
          continue;
        }

        throw new SignedRequestError(
          `Request failed with status ${response.status}`,
          response.status,
          parsedBody
        );
      }

      const data = (await response.json()) as TResponse;
      return data;
    } catch (error) {
      if (error instanceof SignedRequestError) {
        throw error;
      }

      // Network errors - retry
      if (attempt < retries) {
        lastError = error instanceof Error ? error : new Error(String(error));
        continue;
      }

      throw error;
    }
  }

  // Should not reach here, but TypeScript needs this
  throw lastError ?? new Error('Request failed after retries');
}
