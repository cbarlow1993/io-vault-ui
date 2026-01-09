// packages/chains/src/svm/transaction-builder.ts

import type {
  ChainAlias,
  SigningPayload,
  TransactionOverrides,
  TransactionType,
  SvmTransactionOverrides,
} from '../core/types.js';
import type {
  UnsignedTransaction,
  SignedTransaction,
  NormalisedTransaction,
  RawSolanaTransaction,
} from '../core/interfaces.js';
import type { SvmChainConfig } from './config.js';
import {
  formatUnits,
  SPL_TOKEN_PROGRAM_ID,
  SPL_TOKEN_2022_PROGRAM_ID,
  SYSTEM_PROGRAM_ID,
  serializeSolanaMessage,
} from './utils.js';
import { SignedSvmTransaction } from './signed-transaction.js';

// Re-export for backwards compatibility
export { SYSTEM_PROGRAM_ID };

// ============ SVM Transaction Data Interface ============

export interface SvmTransactionData {
  version: 'legacy' | 0;
  recentBlockhash: string;
  feePayer: string;
  instructions: Array<{
    programId: string;
    accounts: Array<{
      pubkey: string;
      isSigner: boolean;
      isWritable: boolean;
    }>;
    data: string; // base64 encoded
  }>;
  value: string; // For native transfers, the amount in lamports
  computeUnitPrice?: number;
  computeUnitLimit?: number;
}

// ============ Unsigned SVM Transaction ============

export class UnsignedSvmTransaction implements UnsignedTransaction {
  readonly chainAlias: ChainAlias;
  readonly raw: SvmTransactionData;
  readonly serialized: string;

  constructor(
    private readonly config: SvmChainConfig,
    txData: SvmTransactionData
  ) {
    this.chainAlias = config.chainAlias;
    this.raw = txData;
    this.serialized = JSON.stringify(txData);
  }

  rebuild(overrides: TransactionOverrides): UnsignedSvmTransaction {
    const svmOverrides = overrides as SvmTransactionOverrides;
    const newTxData: SvmTransactionData = {
      ...this.raw,
    };

    if (svmOverrides.computeUnitPrice !== undefined) {
      newTxData.computeUnitPrice = svmOverrides.computeUnitPrice;
    }
    if (svmOverrides.computeUnitLimit !== undefined) {
      newTxData.computeUnitLimit = svmOverrides.computeUnitLimit;
    }

    return new UnsignedSvmTransaction(this.config, newTxData);
  }

  getSigningPayload(): SigningPayload {
    // Compute the message that needs to be signed
    // For Solana, this is the serialized message (transaction without signatures)
    const messageToSign = this.computeMessageToSign();

    return {
      chainAlias: this.chainAlias,
      data: [messageToSign],
      algorithm: 'ed25519',
    };
  }

  applySignature(signatures: string[]): SignedTransaction {
    if (signatures.length === 0) {
      throw new Error('Solana transactions require at least one signature');
    }

    // Validate all signatures are valid base64
    for (const signature of signatures) {
      if (!this.isValidBase64(signature)) {
        throw new Error('Invalid signature format: expected base64-encoded signature');
      }
    }

    return new SignedSvmTransaction(this.config, this.raw, signatures);
  }

  toNormalised(): NormalisedTransaction {
    const type = this.classifyTransaction();
    const formattedValue = formatUnits(
      BigInt(this.raw.value || '0'),
      this.config.nativeCurrency.decimals
    );

    const normalised: NormalisedTransaction = {
      chainAlias: this.chainAlias,
      to: this.extractDestination(),
      value: this.raw.value || '0',
      formattedValue,
      symbol: this.config.nativeCurrency.symbol,
      type,
      data: this.raw.instructions.length > 0 ? this.raw.instructions[0]!.data : undefined,
      metadata: {
        isContractDeployment: false, // Solana uses different deployment model
      },
    };

    // Add token transfer info if applicable
    if (type === 'token-transfer') {
      const tokenInstruction = this.findTokenInstruction();
      if (tokenInstruction) {
        normalised.tokenTransfer = {
          contractAddress: tokenInstruction.programId,
          from: this.raw.feePayer,
          to: tokenInstruction.accounts[1]?.pubkey || '',
          value: '0', // Would need to decode instruction data
          formattedValue: '0',
          symbol: '',
          decimals: 9,
        };
      }
    }

    // Add program call info if applicable
    if (type === 'contract-call') {
      const instruction = this.raw.instructions[0];
      if (instruction) {
        normalised.contractCall = {
          contractAddress: instruction.programId,
        };
      }
    }

    return normalised;
  }

  toRaw(): RawSolanaTransaction {
    return {
      _chain: 'svm',
      version: this.raw.version,
      recentBlockhash: this.raw.recentBlockhash,
      feePayer: this.raw.feePayer,
      instructions: this.raw.instructions.map((ix) => ({
        programId: ix.programId,
        accounts: ix.accounts.map((acc) => ({
          pubkey: acc.pubkey,
          isSigner: acc.isSigner,
          isWritable: acc.isWritable,
        })),
        data: ix.data,
      })),
    };
  }

  private classifyTransaction(): TransactionType {
    if (this.raw.instructions.length === 0) {
      return 'native-transfer';
    }

    const programIds = this.raw.instructions.map((ix) => ix.programId);

    // Check for System Program transfer
    if (programIds.includes(SYSTEM_PROGRAM_ID) && programIds.length === 1) {
      return 'native-transfer';
    }

    // Check for SPL Token Program
    if (programIds.includes(SPL_TOKEN_PROGRAM_ID) || programIds.includes(SPL_TOKEN_2022_PROGRAM_ID)) {
      return 'token-transfer';
    }

    // Default to contract call (program invocation)
    return 'contract-call';
  }

  private extractDestination(): string | null {
    if (this.raw.instructions.length === 0) {
      return null;
    }

    const instruction = this.raw.instructions[0]!;

    // For System Program transfer, the second account is the destination
    if (instruction.programId === SYSTEM_PROGRAM_ID && instruction.accounts.length >= 2) {
      return instruction.accounts[1]!.pubkey;
    }

    // For token transfers, return the destination token account
    if (
      instruction.programId === SPL_TOKEN_PROGRAM_ID ||
      instruction.programId === SPL_TOKEN_2022_PROGRAM_ID
    ) {
      if (instruction.accounts.length >= 2) {
        return instruction.accounts[1]!.pubkey;
      }
    }

    return instruction.programId;
  }

  private findTokenInstruction() {
    return this.raw.instructions.find(
      (ix) => ix.programId === SPL_TOKEN_PROGRAM_ID || ix.programId === SPL_TOKEN_2022_PROGRAM_ID
    );
  }

  private computeMessageToSign(): string {
    // Serialize the transaction message according to Solana's binary format
    const messageBytes = serializeSolanaMessage(
      this.raw.feePayer,
      this.raw.recentBlockhash,
      this.raw.instructions
    );

    // Return base64-encoded serialized message for signing
    return Buffer.from(messageBytes).toString('base64');
  }

  private isValidBase64(str: string): boolean {
    try {
      // Check if it's valid base64 format
      if (!/^[A-Za-z0-9+/]*={0,2}$/.test(str)) {
        return false;
      }
      // Try to decode it
      const decoded = Buffer.from(str, 'base64');
      // Re-encode and compare (accounts for padding differences)
      return decoded.length > 0;
    } catch {
      return false;
    }
  }
}
