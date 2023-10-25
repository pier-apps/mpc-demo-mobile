import type { KeyShare } from '@pier-wallet/mpc-lib';
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
  async setStorage(value: KeyShare) {
    await this.storage.setItem(this.storageKey, JSON.stringify(value));
  }
  async getStorage() {
    const value = await this.storage.getItem(this.storageKey);
    if (typeof value !== 'string') return undefined;
    try {
      return JSON.parse(value);
    } catch (e) {
      console.error(e);
      return undefined;
    }
  }
}
