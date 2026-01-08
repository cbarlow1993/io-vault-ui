export enum Status {
  MONITORED = 'MONITORED',
  UNMONITORED = 'UNMONITORED',
}

export namespace AddressKeys {
  export const pk = (address: string) => `ADDR#${address}` as const;
  export const sk = (chain: string, monitored: Status = Status.MONITORED) =>
    `CHAIN#${chain}#${monitored === Status.MONITORED ? 'MONITORED' : 'UNMONITORED'}` as const;

  export const gsi1pk = (vaultId: string) => `VAULT#${vaultId}` as const;
  export const gsi2pk = (subscriptionId: string) => `SUB#${subscriptionId}` as const;
  export const gsi3pk = (vaultId: string) => `VAULT#${vaultId}` as const;

  export const gsi1sk = {
    root: (chain: string, address: string) => `CHAIN#${chain}#ROOT#ADDR#${address}` as const,
    child: (chain: string, address: string, derivationPath: string) =>
      `CHAIN#${chain}#CHILD#${derivationPath}#ADDR#${address}` as const,
    beginsWithChain: (chain: string) => `CHAIN#${chain}` as const,
    childPrefix: (chain: string) => `CHAIN#${chain}#CHILD` as const,
    rootPrefix: (chain: string) => `CHAIN#${chain}#ROOT` as const,
  };
  export const gsi3sk = {
    root: (chain: string, address: string, monitored = true) =>
      `${monitored ? 'MONITORED' : 'UNMONITORED'}#CHAIN#${chain}#ROOT#ADDR#${address}` as const,
    child: (chain: string, address: string, derivationPath: string, monitored = true) =>
      `${monitored ? 'MONITORED' : 'UNMONITORED'}#CHAIN#${chain}#CHILD#${derivationPath}#ADDR#${address}` as const,
  };
}

export const hdMetadataKeys = {
  pk: (vaultId: string) => `VAULT#${vaultId}` as const,
  sk: (chain: string) => `CHAIN#${chain}#METADATA` as const,
};
