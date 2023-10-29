/* eslint-disable max-lines-per-function */
// eslint-disable-next-line simple-import-sort/imports
import { KeyShare } from '@pier-wallet/mpc-lib';
import { useCallback, useEffect, useState } from 'react';
import * as CloudStore from 'react-native-cloud-store';
import {
  PathUtils,
  defaultICloudContainerPath,
} from 'react-native-cloud-store';

import { storageMKKV } from '../../core/storage';
import { KeyStorage } from './key-storage';

const keyStorage = new KeyStorage('pier-wallet-mpc-keyshare', storageMKKV);

export const useKeyStorage = () => {
  const [keyShare, setKeyShare] = useState<KeyShare | null>(null);

  const dirPath = PathUtils.join(
    defaultICloudContainerPath ?? '/',
    '/Documents/DO NOT DELETE pier mpc backup'
  );
  // TODO: Add address or sth to filename?
  const filePath = PathUtils.join(
    defaultICloudContainerPath ?? '/',
    'Documents//DO NOT DELETE pier mpc backup/keyShare.json'
  );
  useEffect(() => {
    // there's a keyshare in memory - no need to load from storage or iCloud
    if (keyShare) {
      return;
    }

    // load keyshare from storage (disk) or iCloud
    (async () => {
      const storedKeyShare = await keyStorage.getStorage();

      // there's no keyshared locally - load keyShare from iCloud
      if (!storedKeyShare) {
        try {
          // TODO: Fix this - it should trigger  a download from iCloud, but it doesn't -- you have to manually open the files app and click on the file
          const isExisting = await CloudStore.exist(filePath);
          const download = await CloudStore.download(filePath);

          console.log('🚀 ~ file: use-key-storage.ts:49 ~ download:', download);
          const backupFromICloud = await CloudStore.readFile(filePath);
          const tempKeyShare = new KeyShare(JSON.parse(backupFromICloud));

          // set keyshare in memory
          setKeyShare(tempKeyShare);
          // set keyshare in storage using MMKV
          await keyStorage.setStorage(tempKeyShare);
          return;
        } catch (e) {
          console.error(e);
        }
      }

      // there's a keyshare locally - load keyShare from storage (disk) and put in memory
      setKeyShare(storedKeyShare);
    })();
  }, [filePath, keyShare]);

  const saveKeyShare = useCallback(
    async (keyShareToSave: KeyShare) => {
      // store in state (memory) for quick access
      setKeyShare(keyShareToSave); // this is state / memory

      // store in storage (disk) using MMKV for persistence
      await keyStorage.setStorage(keyShareToSave);

      // store in iCloud for backup
      try {
        await CloudStore.createDir(dirPath);
        await CloudStore.writeFile(
          filePath,
          JSON.stringify(keyShareToSave.raw()).toString(),
          {
            override: false,
          }
        );
      } catch (e) {
        console.error(e);
      }
    },
    [dirPath, filePath]
  );

  const clearKeyShare = useCallback(async () => {
    await keyStorage.setStorage(null);
    setKeyShare(null);
  }, []);

  return { keyShare, saveKeyShare, clearKeyShare };
};
