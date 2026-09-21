/**
 * lockService.ts
 * Path: src/reception/lib/sync/lockService.ts
 *
 * Provides atomic execution mutex locking across browser tabs/windows.
 * Uses `navigator.locks` when available, with an in-memory fallback for test environments.
 */

export class LockService {
  private inMemoryLocks: Map<string, Promise<any>> = new Map();

  /**
   * Executes a callback within an exclusive named lock.
   */
  async request<T>(name: string, callback: () => Promise<T>): Promise<T> {
    // 1. Browser navigator.locks API (Web Locks)
    if (typeof navigator !== 'undefined' && 'locks' in navigator && typeof navigator.locks?.request === 'function') {
      return new Promise<T>((resolve, reject) => {
        navigator.locks.request(name, { mode: 'exclusive' }, async (lock) => {
          if (!lock) {
            throw new Error(`Failed to acquire lock: ${name}`);
          }
          try {
            const result = await callback();
            resolve(result);
          } catch (err) {
            reject(err);
          }
        }).catch(reject);
      });
    }

    // 2. In-memory sequential queue fallback (Node / Vitest / Legacy browsers)
    const currentLock = this.inMemoryLocks.get(name) || Promise.resolve();
    let releaseLock: () => void;
    const nextLock = new Promise<void>((resolve) => {
      releaseLock = resolve;
    });

    this.inMemoryLocks.set(name, nextLock);

    await currentLock;
    try {
      return await callback();
    } finally {
      releaseLock!();
      if (this.inMemoryLocks.get(name) === nextLock) {
        this.inMemoryLocks.delete(name);
      }
    }
  }

  async withLock<T>(name: string, callback: () => Promise<T>): Promise<T> {
    return this.request(name, callback);
  }
}

export const lockService = new LockService();

