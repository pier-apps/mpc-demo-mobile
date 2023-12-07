/* eslint-disable max-lines-per-function */
import 'react-native-get-random-values';
import '@ethersproject/shims';

import { SessionKind } from '@pier-wallet/mpc-lib';
import {
  PierMpcBitcoinWallet,
  PierMpcBitcoinWalletNetwork,
} from '@pier-wallet/mpc-lib/dist/package/bitcoin';
import { PierMpcEthereumWallet } from '@pier-wallet/mpc-lib/dist/package/ethers-v5';
import { usePierMpc } from '@pier-wallet/mpc-lib/dist/package/react-native';
import { useQuery } from '@tanstack/react-query';
import { ethers } from 'ethers';
import * as Clipboard from 'expo-clipboard';
import React, { useState } from 'react';

import { translate } from '@/core';
import { Button, FocusAwareStatusBar, ScrollView, Text, View } from '@/ui';

import { SendBitcoinTransaction } from './send-bitcoin-transaction';
import { SendEthereumTransaction } from './send-ethereum-transaction';
import { useKeyStorage } from './use-key-storage';

const ethereumProvider = new ethers.providers.StaticJsonRpcProvider(
  'https://eth-sepolia.g.alchemy.com/v2/BQ_nMljcV-AUx1EgSMzjSiFQLAlIUQvR'
);

export const Mpc = () => {
  // MPC below

  const pierMpcVaultSdk = usePierMpc();
  const { keyShare, saveKeyShare, clearKeyShare } = useKeyStorage();
  const [keyShareSatus, setKeyShareStatus] = useState<
    'idle' | 'loading' | 'success' | 'error'
  >('idle');
  const [ethSignatureStatus, setEthSignatureStatus] = useState<
    'idle' | 'loading' | 'success' | 'error'
  >('idle');
  const [ethSignature, setEthSignature] = useState<string | null>(null);

  const wallets = useQuery({
    queryKey: ['keyShare', keyShare?.publicKey],
    queryFn: async () => {
      if (!keyShare) {
        return null;
      }
      const signConnection = await pierMpcVaultSdk.establishConnection(
        SessionKind.SIGN,
        keyShare.partiesParameters
      );
      const ethWallet = new PierMpcEthereumWallet(
        keyShare,
        signConnection,
        pierMpcVaultSdk,
        ethereumProvider
      );
      const btcWallet = new PierMpcBitcoinWallet(
        keyShare,
        PierMpcBitcoinWalletNetwork.Testnet,
        signConnection,
        pierMpcVaultSdk
      );

      return { ethWallet, btcWallet };
    },
    refetchInterval: 0,
    retry: false,
    refetchIntervalInBackground: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
    refetchOnWindowFocus: false,
  }).data;
  const { btcWallet, ethWallet } = wallets || {
    btcWallet: null,
    ethWallet: null,
  };

  const generateKeyShare = async () => {
    setKeyShareStatus('loading');
    try {
      const tempKeyShare = await pierMpcVaultSdk.generateKeyShare();
      console.log('local key share generated.', tempKeyShare.publicKey);
      saveKeyShare(tempKeyShare);
      setKeyShareStatus('success');
    } catch (e) {
      console.error(e);
      setKeyShareStatus('error');
    }
  };

  const signMessageWithEth = async () => {
    if (!ethWallet) {
      console.error('wallet not generated');
      return;
    }
    setEthSignatureStatus('loading');
    const message = 'hello world';
    const signature = await ethWallet.signMessage(message);
    console.log(`local signature generated: ${signature}`);
    setEthSignature(signature);
    setEthSignatureStatus('success');
  };

  return (
    <>
      <FocusAwareStatusBar />
      <ScrollView>
        <View className="flex-1 px-4 pt-16 ">
          <Text variant="lg" className="font-bold">
            {translate('mpc.title')}
          </Text>

          {!keyShare && (
            <Button
              label="Create wallet"
              onPress={generateKeyShare}
              loading={keyShareSatus === 'loading'}
              disabled={
                keyShareSatus === 'loading' || keyShareSatus === 'success'
              }
            />
          )}

          <Text variant="sm">ETH Address: {ethWallet?.address}</Text>
          <Text variant="sm">BTC Address: {btcWallet?.address}</Text>
          <Button
            label="Copy ETH address"
            onPress={async () =>
              await Clipboard.setStringAsync(ethWallet?.address || '')
            }
            loading={ethSignatureStatus === 'loading'}
            disabled={!ethWallet}
          />
          <Button
            label="Copy BTC address"
            onPress={async () =>
              await Clipboard.setStringAsync(btcWallet?.address || '')
            }
            disabled={!btcWallet}
          />
        </View>
        <View className="flex-1 px-4 pt-16 ">
          <Button
            label="Sign message with ETH"
            onPress={signMessageWithEth}
            loading={ethSignatureStatus === 'loading'}
            disabled={!ethWallet}
          />
          {ethSignature && <Text>Signature: {ethSignature}</Text>}
        </View>
        <SendEthereumTransaction ethWallet={ethWallet} />
        <SendBitcoinTransaction btcWallet={btcWallet} />
        {!!keyShare && (
          <Button
            label="Delete wallet"
            variant="secondary"
            onPress={clearKeyShare}
            loading={keyShareSatus === 'loading'}
            disabled={!keyShare}
          />
        )}
      </ScrollView>
    </>
  );
};
