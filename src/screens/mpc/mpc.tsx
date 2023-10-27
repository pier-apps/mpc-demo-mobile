/* eslint-disable max-lines-per-function */
import 'react-native-get-random-values';
import '@ethersproject/shims';

import { SessionKind } from '@pier-wallet/mpc-lib';
import { PierMpcBitcoinWallet } from '@pier-wallet/mpc-lib/dist/package/bitcoin';
import { PierMpcEthereumWallet } from '@pier-wallet/mpc-lib/dist/package/ethers-v5';
import {
  PierMpcSdkReactNativeProvider,
  usePierMpcSdk,
} from '@pier-wallet/mpc-lib/dist/package/react-native';
import { useQuery } from '@tanstack/react-query';
import { ethers } from 'ethers';
import * as Clipboard from 'expo-clipboard';
import React, { useState } from 'react';

import { translate } from '@/core';
import { Button, FocusAwareStatusBar, ScrollView, Text, View } from '@/ui';

import { SendEthereumTransaction } from './send-ethereum-transaction';
import { api, supabase } from './trpc';
import { useKeyStorage } from './use-key-storage';

const ethereumProvider = new ethers.providers.JsonRpcProvider(
  'https://eth-sepolia.g.alchemy.com/v2/BQ_nMljcV-AUx1EgSMzjSiFQLAlIUQvR'
);

export const Mpc = () => {
  return (
    <PierMpcSdkReactNativeProvider supabase={supabase}>
      <MpcInner />
    </PierMpcSdkReactNativeProvider>
  );
};

const MpcInner = () => {
  const pierMpcSdk = usePierMpcSdk();
  const { keyShare, saveKeyShare, clearKeyShare } = useKeyStorage();
  const [keyShareSatus, setKeyShareStatus] = useState<
    'idle' | 'loading' | 'success' | 'error'
  >('idle');
  const [ethSignatureStatus, setEthSignatureStatus] = useState<
    'idle' | 'loading' | 'success' | 'error'
  >('idle');
  const [ethSignature, setEthSignature] = useState<string | null>(null);
  const [btcTxHash, setBtcTxHash] = useState<string | null>(null);

  const wallets = useQuery({
    queryKey: ['keyShare', keyShare?.publicKey],
    queryFn: async () => {
      if (!keyShare) {
        return null;
      }
      const signConnection = await establishConnection(SessionKind.SIGN);
      const ethWallet = new PierMpcEthereumWallet(
        keyShare,
        signConnection,
        pierMpcSdk,
        ethereumProvider
      );
      const btcWallet = new PierMpcBitcoinWallet(
        keyShare,
        'testnet',
        signConnection,
        pierMpcSdk
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

  async function establishConnection<T extends SessionKind>(sessionKind: T) {
    const { sessionId } = await api.createSession.mutate({
      sessionKind,
    });
    const transport = await pierMpcSdk.establishConnection(sessionKind, {
      type: 'join',
      sessionId,
    });
    return transport;
  }

  const generateKeyShare = async () => {
    setKeyShareStatus('loading');
    try {
      const connection = await establishConnection(SessionKind.KEYGEN);
      api.generateKeyShare
        .mutate({
          sessionId: connection.sessionId,
        })
        .then((res: unknown) =>
          console.log(
            `server finished generating key share: "${JSON.stringify(res)}"`
          )
        );
      const tempKeyShare = await pierMpcSdk.generateKeyShare(connection);
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
    api.signMessage
      .mutate({
        publicKey: ethWallet.keyShare.publicKey,
        message,
        sessionId: ethWallet.connection.sessionId,
      })
      .then(() => console.log('server finished signing message'));
    const signature = await ethWallet.signMessage(message);
    console.log(`local signature generated: ${signature}`);
    setEthSignature(signature);
    setEthSignatureStatus('success');
  };

  const sendBitcoinTransaction = async () => {
    const faucetAddress = 'tb1qw2c3lxufxqe2x9s4rdzh65tpf4d7fssjgh8nv6';

    if (!btcWallet) {
      console.error('wallet not generated');
      return;
    }
    const tx = await btcWallet.createTransaction({
      to: faucetAddress,
      value: 800n,
      feePerByte: 1n,
    });
    api.bitcoin.sendTransaction
      .mutate({
        sessionId: btcWallet.connection.sessionId,
        publicKey: btcWallet.keyShare.publicKey,
        transaction: tx.toObject(),
      })
      .then((res: unknown) =>
        console.log(
          `server finished sending transaction: "${JSON.stringify(res)}"`
        )
      );
    const hash = await btcWallet.sendTransaction(tx);
    setBtcTxHash(hash);
    console.log('btc hash', hash);
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
          <Button
            label="Copy ETH address"
            onPress={async () =>
              await Clipboard.setStringAsync(ethWallet?.address || '')
            }
            loading={ethSignatureStatus === 'loading'}
            disabled={!ethWallet}
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
        <SendEthereumTransaction wallet={ethWallet} />
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
