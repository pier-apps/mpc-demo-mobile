import type { KeyShare } from '@pier-wallet/mpc-lib';
import { useCallback, useEffect, useState } from 'react';

import { storageMKKV } from '../../core/storage';
import { KeyStorage } from './key-storage';

const keyStorage = new KeyStorage('pier-wallet-mpc-keyshare', storageMKKV);

export const useKeyStorage = () => {
  const [keyShare, setKeyShare] = useState<KeyShare | null>(null);
  useEffect(() => {
    if (keyShare) {
      return;
    }
    (async () => {
      const storedKeyShare = await keyStorage.getStorage();
      setKeyShare(storedKeyShare);
    })();
  }, [keyShare]);

  const saveKeyShare = useCallback(async (keyShareToSave: KeyShare) => {
    await keyStorage.setStorage(keyShareToSave);
    setKeyShare(keyShareToSave);
  }, []);

  return { keyShare, saveKeyShare };
};
