import { address, Psbt } from '@iofinnet/bitcoinjs-lib';
import { logger } from '@/utils/powertools.js';

export const validatePsbt = ({
  psbtHex,
  expected,
}: {
  psbtHex: string;
  expected: { to: string; from: string; amount?: bigint };
}): void => {
  let psbt: Psbt;

  try {
    psbt = Psbt.fromHex(psbtHex);
  } catch (error) {
    logger.critical('Unable to validate psbt: invalid psbt hex', { error, params: { psbtHex } });
    throw new Error('Invalid psbt hex');
  }

  if (!psbt.data.inputs.length) {
    logger.critical('Unable to validate psbt: PSBT has no inputs', { params: { psbtHex } });
    throw new Error('PSBT must have at least one input');
  }

  const input = psbt.data.inputs[0]!;

  if (!psbt.txOutputs.length) {
    logger.critical('Unable to validate psbt: PSBT has no outputs', { params: { psbtHex } });
    throw new Error('PSBT must have at least one output');
  }

  if (!input.witnessUtxo?.script) {
    logger.critical('Unable to validate psbt: missing witnessUtxo script for input', {
      params: { psbtHex },
    });
    throw new Error('Missing witnessUtxo script for input');
  }

  // Derive sender address
  let fromAddress: string;
  try {
    fromAddress = address.fromOutputScript(input.witnessUtxo.script);
  } catch (error) {
    logger.critical('Failed to derive sender address from input script', {
      error,
      params: { psbtHex },
    });
    throw new Error('Invalid input script format in PSBT');
  }

  // Find and derive recipient output
  const recipientOutput = psbt.txOutputs.find((o) => {
    try {
      return address.fromOutputScript(o.script) === expected.to;
    } catch {
      return false;
    }
  });

  if (!recipientOutput) {
    logger.critical('Recipient output not found', { expectedTo: expected.to, params: { psbtHex } });
    throw new Error('Expected recipient output missing in PSBT');
  }

  let toAddress: string;
  try {
    toAddress = address.fromOutputScript(recipientOutput.script);
  } catch (error) {
    logger.critical('Failed to derive recipient address from output script', {
      error,
      params: { psbtHex },
    });
    throw new Error('Invalid output script format in PSBT');
  }

  const outputAmount = recipientOutput.value;

  if (
    fromAddress !== expected.from ||
    toAddress !== expected.to ||
    (expected.amount && outputAmount !== expected.amount)
  ) {
    logger.critical('Received PSBT does not match expected values', {
      fromAddress,
      toAddress,
      outputAmount,
      expected,
      params: { psbtHex },
    });
    throw new Error('PSBT does not match expected values');
  }
};
