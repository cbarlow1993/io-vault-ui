import { base58 } from '@scure/base';

type BufferJson = { type: 'Buffer'; data: number[] };

export type RawSolanaTx = {
  messageBytes: Uint8Array | BufferJson;
  signatures: Record<string, string | null>;
};

/** Convert Buffer JSON or Uint8Array to Uint8Array */
function asBytes(src: Uint8Array | BufferJson): Uint8Array {
  if ((src as any)?.type === 'Buffer') return new Uint8Array((src as BufferJson).data);
  return src as Uint8Array;
}

/** Solana shortvec (compact-u16) encoding for lengths */
function encodeShortVecLength(n: number): number[] {
  const out: number[] = [];
  let rem = n >>> 0;
  while (true) {
    const elem = rem & 0x7f;
    rem >>>= 7;
    if (rem === 0) {
      out.push(elem);
      break;
    } else {
      out.push(elem | 0x80);
    }
  }
  return out;
}

/** Serialize full transaction (signatures + message) */
function serializeSolanaTransaction(raw: RawSolanaTx): Uint8Array {
  const message = asBytes(raw.messageBytes);

  const sigValues = Object.values(raw.signatures ?? {});
  const sigCount = sigValues.length;

  const parts: number[] = [];

  // <signature_count>
  parts.push(...encodeShortVecLength(sigCount));

  for (const sig of sigValues) {
    if (sig == null) {
      // 64 zero bytes
      parts.push(...new Uint8Array(64));
      continue;
    }
    let bytes: Uint8Array;
    bytes = base58.decode(sig);
    if (bytes.length !== 64) {
      throw new Error(`Invalid signature length ${bytes.length} (expected 64)`);
    }
    parts.push(...bytes);
  }

  // <message_bytes>
  parts.push(...message);

  return new Uint8Array(parts);
}

/**
 * Build Blockaid payload: array of serialized tx strings
 * @param raw single raw tx (you can call multiple times for many)
 * @param outputEncoding 'base58' or 'base64' (what Blockaid should receive)
 * @param inputSignatureEncoding how the *provided* signature strings are encoded (default 'base58')
 */
export function buildSolanaBlockaidTransactions(raw: RawSolanaTx): string[] {
  const bytes = serializeSolanaTransaction(raw);
  return [base58.encode(bytes)];
}
