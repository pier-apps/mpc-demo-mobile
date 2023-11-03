/* eslint-disable max-lines-per-function */
import { zodResolver } from '@hookform/resolvers/zod';
import type { PierMpcEthereumWallet } from '@pier-wallet/mpc-lib/dist/package/ethers-v5';
import { useQuery } from '@tanstack/react-query';
import { ethers } from 'ethers';
import React from 'react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { Button, ControlledInput, Text, View } from '@/ui';

const schema = z.object({
  receiver: zAddress(),
  amount: z.string(),
});

type FormType = z.infer<typeof schema>;

function zAddress() {
  return z.string().refine((s) => ethers.utils.isAddress(s), 'Invalid address');
}

export function SendEthereumTransaction({
  ethWallet,
}: {
  ethWallet: PierMpcEthereumWallet | null;
}) {
  const balance = useQuery({
    queryKey: ['ethereum', 'balance', ethWallet?.address.toLowerCase()],
    queryFn: async () => {
      if (!ethWallet) {
        return '';
      }
      const b = await ethWallet.getBalance();
      return `${ethers.utils.formatEther(b)} ETH`;
    },
  });

  const [sendEthResult, setSendEthResult] = useState('');
  const { handleSubmit, control } = useForm<FormType>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormType) => {
    if (!ethWallet) {
      console.error('no wallet');
      return;
    }

    let weiAmount: ethers.BigNumber;
    weiAmount = ethers.utils.parseEther(data.amount);

    try {
      setSendEthResult('');
      const txRequest = await ethWallet.populateTransaction({
        to: data.receiver,
        value: weiAmount,
      });

      const tx = await ethWallet.sendTransaction(txRequest);

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
      <View className="flex-1 justify-center p-4">
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
          disabled={balance.isLoading || balance.isError || !ethWallet}
        />

        <Text>{sendEthResult}</Text>
      </View>
    </>
  );
}
