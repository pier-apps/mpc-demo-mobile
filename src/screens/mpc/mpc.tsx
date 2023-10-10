import '@ethersproject/shims';

import { type PierMpcWallet, SessionKind } from '@pier-wallet/mpc-lib';
import {
  PierMpcSdkReactNativeProvider,
  usePierMpcSdk,
} from '@pier-wallet/mpc-lib/dist/react-native';
import React, { useState } from 'react';

import { Button, Text } from '@/ui';

const PIER_MPC_SERVER_URL = 'https://mpc-server-7ca971e09088.herokuapp.com';
export const Mpc = () => {
  return (
    <PierMpcSdkReactNativeProvider websocketUrl={PIER_MPC_SERVER_URL}>
      <MpcInner />
    </PierMpcSdkReactNativeProvider>
  );
};

const MpcInner = () => {
  const pierMpcSdk = usePierMpcSdk();

  const [wallet, setWallet] = useState<PierMpcWallet | null>(null);
  const [signature, setSignature] = useState<any>(null);

  return (
    <>
      {wallet && <Text> Key share: {wallet.address}</Text>}
      <Button
        label="Generate key share"
        onPress={async () => {
          const { sessionId } = await api.createSession({
            sessionKind: SessionKind.KEYGEN,
          });
          const groupSessionIds = await pierMpcSdk.establishConnection(
            SessionKind.KEYGEN,
            {
              type: 'join',
              sessionId,
            }
          );
          api.generateKeyShare({ sessionId }).then(() => {
            console.log('generated key share on server');
          });
          const keyShare = await pierMpcSdk.generateKeyShare(groupSessionIds);

          const signSessionInfo = await api.createSession({
            sessionKind: SessionKind.SIGN,
          });
          const signGroupSessionInfo = await pierMpcSdk.establishConnection(
            SessionKind.SIGN,
            {
              type: 'join',
              ...signSessionInfo,
            }
          );
          setWallet(
            pierMpcSdk.walletFromKeyShare(keyShare, signGroupSessionInfo)
          );
          console.log('got key share', keyShare.address);
        }}
      />
      {signature && <Text>Signature: {signature}</Text>}
      <Button
        label="Sign message"
        disabled={!wallet}
        onPress={async () => {
          if (!wallet) {
            return;
          }
          const message = 'hello world';
          api
            .signMessage({
              sessionId: wallet.connection.sessionId,
              signerAddress: wallet.address,
              message,
            })
            .then(() => {
              console.log('signed message on server');
            });
          const signature = await wallet.signMessage(message);
          console.log('got signature', signature);
          setSignature(signature);
        }}
      />
    </>
  );
};

type SessionInfo = {
  sessionId: string;
};

class Api {
  constructor(private readonly apiUrl: string) {}

  async createSession({
    sessionKind,
  }: {
    sessionKind: SessionKind;
  }): Promise<SessionInfo> {
    const { sessionId } = await fetch(`${this.apiUrl}/createSession`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sessionKind,
      }),
    }).then((res) => res.json());
    return { sessionId };
  }

  async generateKeyShare(data: SessionInfo) {
    await fetch(`${this.apiUrl}/generateKeyShare`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
  }

  async signMessage(
    data: {
      signerAddress: string;
      message: string;
    } & SessionInfo
  ) {
    await fetch(`${this.apiUrl}/signMessage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
  }
}

const api = new Api(PIER_MPC_SERVER_URL);
