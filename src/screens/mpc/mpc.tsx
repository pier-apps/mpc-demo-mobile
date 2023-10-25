/* eslint-disable max-lines-per-function */
import 'react-native-get-random-values';
import '@ethersproject/shims';

import type { KeyShare } from '@pier-wallet/mpc-lib';
import { SessionKind } from '@pier-wallet/mpc-lib';
// import { PierMpcBitcoinWallet } from '@pier-wallet/mpc-lib/dist/package/bitcoin';
import { PierMpcEthereumWallet } from '@pier-wallet/mpc-lib/dist/package/ethers-v5';
import {
  PierMpcSdkReactNativeProvider,
  usePierMpcSdk,
} from '@pier-wallet/mpc-lib/dist/package/react-native';
import { useQuery } from '@tanstack/react-query';
// import * as bitcoinJS from 'bitcoinjs-lib';
// console.log(
//   '🚀 ~ file: mpc.tsx:16 ~ bitcoin:',
//   bitcoinJS.crypto.hash256(Buffer.from([1, 2, 3]))
// );
import React, { useState } from 'react';

import { translate } from '@/core';
import { Button, FocusAwareStatusBar, ScrollView, Text, View } from '@/ui';

import { api } from './trpc';

const supabaseTestUser = {
  id: '11062eb7-60ad-493c-84b6-116bdda7a7c3',
  email: 'mpc-lib-test@example.com',
  password: '123456',
};
export const Mpc = () => {
  return (
    <PierMpcSdkReactNativeProvider credentials={supabaseTestUser}>
      <MpcInner />
    </PierMpcSdkReactNativeProvider>
  );
};

const MpcInner = () => {
  const pierMpcSdk = usePierMpcSdk();

  const [keyShare, setKeyShare] = useState<KeyShare | null>(null);
  const [keyShareSatus, setKeyShareStatus] = useState<
    'idle' | 'loading' | 'success' | 'error'
  >('idle');

  const [ethSignature, setEthSignature] = useState<string | null>(null);
  const [btcTxHash, setBtcTxHash] = useState<string | null>(null);

  // useEffect(() => {
  //   supabase.auth.signInWithPassword(supabaseTestUser);
  // }, []);

  // useEffect(() => {
  //   const keyPair = ECPair.makeRandom();
  //   const { address } = bitcoin.payments.p2pkh({ pubkey: keyPair.publicKey });
  //   console.log('address', address);
  // }, []);

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
        pierMpcSdk
      );
      // const btcWallet = new PierMpcBitcoinWallet(
      //   keyShare,
      //   'testnet',
      //   signConnection,
      //   pierMpcSdk
      // );
      const btcWallet = null as any;

      return { ethWallet, btcWallet };
    },
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
      const keyShare = await pierMpcSdk.generateKeyShare(connection);
      console.log('local key share generated.', keyShare.publicKey);
      setKeyShare(keyShare);
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

          <Button
            label="Generate key share"
            onPress={generateKeyShare}
            loading={keyShareSatus === 'loading'}
            disabled={
              keyShareSatus === 'loading' || keyShareSatus === 'success'
            }
          />
          {<Text>ETH Address: {ethWallet?.address}</Text>}
        </View>
      </ScrollView>
    </>
  );
};
