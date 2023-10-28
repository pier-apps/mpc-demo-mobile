import { KeyShare } from '@pier-wallet/mpc-lib';
import type { AsyncOrSync } from 'ts-essentials';

// Storage class with setStorage and getStorage
export class KeyStorage {
  constructor(
    readonly storageKey: string,
    readonly storage: {
      setItem: (key: string, value: string) => AsyncOrSync<void>;
      getItem: (key: string) => AsyncOrSync<unknown>;
    }
  ) {}

  // TODO: Think about multiple storage keys for same device
  async setStorage(value: KeyShare | null) {
    await this.storage.setItem(this.storageKey, JSON.stringify(value?.raw()));
  }
  async getStorage(): Promise<KeyShare | null> {
    const value = await this.storage.getItem(this.storageKey);
    if (typeof value !== 'string') return null;
    try {
      return new KeyShare(JSON.parse(value));
    } catch (e) {
      console.error(e);
      return null;
    }
  }
}
