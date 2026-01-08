export namespace TokenMetadataKeys {
  export const pk = (chain: string) => `CHAIN#${chain}` as const;
  export const sk = (address: string) => `TOKEN#${address.toLowerCase()}` as const;
}
