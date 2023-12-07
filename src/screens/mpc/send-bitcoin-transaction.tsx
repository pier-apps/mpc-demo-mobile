/* eslint-disable max-lines-per-function */
import { zodResolver } from '@hookform/resolvers/zod';
import type { PierMpcBitcoinWallet } from '@pier-wallet/mpc-lib/dist/package/bitcoin';
import { useQuery } from '@tanstack/react-query';
import { ethers } from 'ethers';
import React from 'react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { Button, ControlledInput, Text, View } from '@/ui';

const BTC_DECIMALS = 8;

const minBtc = '0.000008';
const schema = z.object({
  receiver: z.string(),
  amount: z
    .string()
    .transform((s, ctx) => {
      let satoshis: bigint;
      try {
        satoshis = ethers.utils.parseUnits(s, BTC_DECIMALS).toBigInt();
      } catch {
        ctx.addIssue({
          code: 'custom',
          message: 'Invalid amount',
          fatal: true,
        });
        return z.NEVER;
      }
      return satoshis;
    })
    .refine(
      (s) => s >= ethers.utils.parseUnits(minBtc, BTC_DECIMALS).toBigInt(),
      `Amount must be greater than ${minBtc}`
    ),
});

export function SendBitcoinTransaction({
  btcWallet,
}: {
  btcWallet: PierMpcBitcoinWallet | null;
}) {
  const balance = useQuery({
    queryKey: ['bitcoin', 'balance', btcWallet?.address],
    queryFn: async () => {
      if (!btcWallet) {
        return '';
      }
      const b = await btcWallet.getBalance();
      return `${ethers.utils.formatUnits(b, BTC_DECIMALS)} BTC`;
    },
  });
  const [sendBtcResult, setSendBtcResult] = useState('');

  const { handleSubmit, control } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      receiver: 'tb1qw2c3lxufxqe2x9s4rdzh65tpf4d7fssjgh8nv6',
      amount: '0.000008',
    },
  });

  const onSubmit = async (d: z.input<typeof schema>) => {
    const data = d as unknown as z.output<typeof schema>; // we need to lie to TS because react-hook-form doesn't understand input/output types
    if (!btcWallet) {
      console.error('no btc wallet');
      return;
    }

    try {
      setSendBtcResult('');
      const tx = await btcWallet.createTransaction({
        to: data.receiver,
        value: data.amount,
        feePerByte: 1n,
      });
      const hash = await btcWallet.sendTransaction(tx);
      setSendBtcResult(`Tx hash: ${hash}`);
    } catch (e: any) {
      console.error(e);
      setSendBtcResult(`Error: ${e.message}`);
    }
  };
  return (
    <>
      <Text>Send Bitcoin transaction</Text>
      <Text>
        Balance:
        {balance.isLoading
          ? 'Loading...'
          : balance.isError
          ? `Error: ${(balance.error as any).message}`
          : balance.data}
      </Text>
      <View>
        <ControlledInput
          control={control}
          name="receiver"
          label="Receiver address"
        />

        <ControlledInput
          control={control}
          name="amount"
          label="Amount (BTC)"
          placeholder="0.1"
        />

        <Button
          label="Send BTC"
          onPress={handleSubmit(onSubmit)}
          variant="primary"
          disabled={balance.isLoading || balance.isError || !btcWallet}
        />

        <Text>{sendBtcResult}</Text>
      </View>
    </>
  );
}
