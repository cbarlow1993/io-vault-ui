import { StatusCode } from '@iofinnet/http-sdk';
import { ZodError } from 'zod';
import { config } from '@/src/lib/config.js';
import { logger } from '@/utils/powertools.js';

export namespace Adamik {
  export interface TransferRequest {
    memo?: string;
    mode: 'transfer';
    senderAddress: string;
    recipientAddress: string;
    senderPubKey?: string;
    amount?: string;
    useMaxAmount?: boolean;
    contractType?: string;
  }

  export interface EncodeResponse {
    chainId: string;
    transaction: {
      data: {
        fees: string;
        gas: string;
        nonce: string;
        memo: string;
        params: Record<string, unknown>;
        mode: string;
        senderPubKey: string;
        contractType: string;
      };
      encoded: Array<{
        hash: {
          format: 'sha256';
          value: string;
        };
        raw: {
          format: 'RLP';
          value: string;
        };
      }>;
    };
    status: {
      errors: Array<{
        message: string;
      }>;
      warnings: Array<{
        message: string;
      }>;
    };
  }
}

async function transfer(
  chainId: string,
  payload: Adamik.TransferRequest
): Promise<Adamik.EncodeResponse> {
  const res = await fetch(`https://api.adamik.io/api/${chainId}/transaction/encode`, {
    method: 'POST',
    headers: {
      Authorization: config.apis.adamik.apiKey!,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ transaction: { data: payload } }),
  });

  if (!res.ok && res.status === StatusCode.BAD_REQUEST.value) {
    const error = (await res.json()) as { status?: { errors?: { message?: string }[] }; message?: string };
    logger.error('unexpected error from Adamik API', { error });
    const message = error?.status?.errors?.[0]?.message || error?.message || 'Bad request';
    throw new ZodError([
      {
        code: 'custom',
        message,
        path: ['errors'],
      },
    ]);
  }

  if (!res.ok) {
    throw new Error(`Adamik API error: ${res.status}`);
  }

  const response = (await res.json()) as Adamik.EncodeResponse;

  return response;
}

export const AdamikService = {
  transfer,
};
