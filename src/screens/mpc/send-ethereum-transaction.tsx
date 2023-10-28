/* eslint-disable max-lines-per-function */
import { zodResolver } from '@hookform/resolvers/zod';
import type { PierMpcEthereumWallet } from '@pier-wallet/mpc-lib/dist/package/ethers-v5';
import { useQuery } from '@tanstack/react-query';
import { ethers } from 'ethers';
import _ from 'lodash';
import React from 'react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { Button, ControlledInput, Text, View } from '@/ui';

import { api } from './trpc';

const schema = z.object({
  receiver: zAddress(),
  amount: z.string(),
});

type FormType = z.infer<typeof schema>;

function zAddress() {
  return z.string().refine((s) => ethers.utils.isAddress(s), 'Invalid address');
}

export function SendEthereumTransaction({
  wallet,
}: {
  wallet: PierMpcEthereumWallet | null;
}) {
  const balance = useQuery({
    queryKey: ['ethereum', 'balance', wallet?.address.toLowerCase()],
    queryFn: async () => {
      if (!wallet) {
        return '';
      }
      const b = await wallet.getBalance();
      return `${ethers.utils.formatEther(b)} ETH`;
    },
  });

  const [sendEthResult, setSendEthResult] = useState('');
  const { handleSubmit, control } = useForm<FormType>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormType) => {
    if (!wallet) {
      console.error('no wallet');
      return;
    }

    let weiAmount: ethers.BigNumber;
    weiAmount = ethers.utils.parseEther(data.amount);

    try {
      setSendEthResult('');
      const txRequest = await wallet.populateTransaction({
        to: data.receiver,
        value: weiAmount,
      });
      const [serverResult, tx] = await Promise.all([
        api.ethereum.signTransaction.mutate({
          sessionId: wallet.connection.sessionId,
          publicKey: wallet.publicKey,
          transaction: _.mapValues(txRequest, (v) =>
            ethers.BigNumber.isBigNumber(v) ? v.toString() : v
          ),
        }),
        await wallet.sendTransaction(txRequest),
      ]);
      console.log('server finished sending transaction', serverResult);
      console.log('local transaction hash', tx.hash);
      setSendEthResult(`Transaction hash: ${tx.hash}`);
    } catch (e: any) {
      setSendEthResult(`Error: ${e?.message}`);
      return;
    }
  };

  return (
    <>
      <Text>Send Ethereum transaction</Text>
      <Text>
        Balance:
        {balance.isLoading
          ? 'Loading...'
          : balance.isError
          ? `Error: ${(balance.error as any).message}`
          : balance.data}
      </Text>
      <View className="justify-center flex-1 p-4">
        <ControlledInput
          control={control}
          name="receiver"
          label="Receiver address"
        />

        <ControlledInput
          control={control}
          name="amount"
          label="Amount (ETH)"
          placeholder="0.1"
        />

        <Button
          testID="send-eth-button"
          label="Send ETH"
          onPress={handleSubmit(onSubmit)}
          variant="primary"
          disabled={balance.isLoading || balance.isError || !wallet}
        />

        <Text>{sendEthResult}</Text>
      </View>
    </>
  );
}
