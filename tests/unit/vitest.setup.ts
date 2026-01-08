import { Chain } from '@iofinnet/io-core-dapp-utils-chains-sdk';

Chain.setAuthContext({
  apiBearerToken: 'api-bearer-token',
  rpcBearerToken: 'rpc-bearer-token',
  iofinnetApiEndpoint: 'https://api.iofinnet.com',
  iofinnetRpcApiEndpoint: 'https://rpc.iofinnet.com',
});
