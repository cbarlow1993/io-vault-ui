import { JsonRpcClient } from '@/src/lib/rpc/client.js';

const ADDRESS = '0x78449b3a4a4642fb12a6073212b0d3e9822464c8';
const RPC_URL = 'https://nodes.iofinnet.com/internal/polygon';

async function main() {
  const rpcClient = new JsonRpcClient({
    chain: 'polygon',
    network: 'mainnet',
    url: RPC_URL,
    timeoutMs: 10000,
  });

  try {
    // Get transaction count (nonce) for the address
    // "latest" means the latest confirmed block
    const latestNonceHex = await rpcClient.call<string>('eth_getTransactionCount', [
      ADDRESS,
      'latest',
    ]);

    // "pending" includes transactions in the mempool
    const pendingNonceHex = await rpcClient.call<string>('eth_getTransactionCount', [
      ADDRESS,
      'pending',
    ]);

    // Convert hex to decimal
    const latestNonce = parseInt(latestNonceHex, 16);
    const pendingNonce = parseInt(pendingNonceHex, 16);
    const pendingTxCount = pendingNonce - latestNonce;

    console.log(`Address: ${ADDRESS}`);
    console.log(`Latest Nonce (Confirmed): ${latestNonce} (${latestNonceHex})`);
    console.log(`Pending Nonce (Including Mempool): ${pendingNonce} (${pendingNonceHex})`);
    
    if (pendingTxCount > 0) {
      console.log(`\n⚠️  Found ${pendingTxCount} pending transaction(s) in mempool!`);
    } else {
      console.log(`\n✓ No pending transactions in mempool`);
    }
  } catch (error) {
    console.error('Error fetching nonce:', error);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

