export namespace TransactionKeys {
  // Primary key structure: TX#{transactionHash}
  export const pk = (address: string) => `ADDR#${address}` as const;

  // Sort key structure: CHAIN#{chain}
  export const sk = {
    full: (chain: string, blockNumber: number, transactionHash: string) =>
      `CHAIN#${chain}#BLOCK#${blockNumber}#TX#${transactionHash}` as const,
    chain: (chain: string) => `CHAIN#${chain}` as const,
    chainAndBlock: (chain: string, blockNumber: number) =>
      `CHAIN#${chain}#BLOCK#${blockNumber}` as const,
    chainAndBlockAndTransaction: (chain: string, blockNumber: number, transactionHash: string) =>
      `CHAIN#${chain}#BLOCK#${blockNumber}#TX#${transactionHash}` as const,
  };

  // GSI1 - Query by vault
  export const gsi1pk = (transactionHash: string) => `TX_ID#${transactionHash}` as const;
}
