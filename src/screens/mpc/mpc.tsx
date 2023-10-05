import type { PierMpcWallet } from '@pier-wallet/mpc-lib';
import { SessionKind } from '@pier-wallet/mpc-lib';
import {
  PierMpcSdkReactNativeProvider,
  usePierMpcSdk,
} from '@pier-wallet/mpc-lib/react-native';
import React, { useState } from 'react';

import { Button, Text } from '@/ui';
export const Mpc = () => {
  return (
    <PierMpcSdkReactNativeProvider websocketUrl="ws://localhost:3030/mpc">
      <MpcInner />
    </PierMpcSdkReactNativeProvider>
  );
};

// eslint-disable-next-line max-lines-per-function
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
          const { groupId, sessionId } = await api.createGroup({
            sessionKind: SessionKind.KEYGEN,
          });
          const groupSessionIds = await pierMpcSdk.establishConnection(
            SessionKind.KEYGEN,
            {
              type: 'join',
              groupId,
              sessionId,
            }
          );
          api.generateKeyShare({ groupId, sessionId }).then(() => {
            console.log('generated key share on server');
          });
          const keyShare = await pierMpcSdk.generateKeyShare(groupSessionIds);

          const signGroupSessionInfoCreated = await api.createGroup({
            sessionKind: SessionKind.SIGN,
          });
          const signGroupSessionInfo = await pierMpcSdk.establishConnection(
            SessionKind.SIGN,
            {
              type: 'join',
              ...signGroupSessionInfoCreated,
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
              groupId: wallet.groupSessionIds.groupId,
              sessionId: wallet.groupSessionIds.sessionId,
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

type GroupSessionInfo = {
  groupId: string;
  sessionId: string;
};

class Api {
  constructor(private readonly apiUrl: string) {}

  async createGroup({
    sessionKind,
  }: {
    sessionKind: SessionKind;
  }): Promise<GroupSessionInfo> {
    const { groupId, sessionId } = await fetch(
      `${this.apiUrl}/createGroupAndSession`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionKind,
        }),
      }
    ).then((res) => res.json());
    return { groupId, sessionId };
  }

  async generateKeyShare(data: GroupSessionInfo) {
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
    } & GroupSessionInfo
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

const api = new Api('http://localhost:8080');
