import { deepClone } from '../utils';

import type { ICallback, ICachedResponse } from '../types';

export class CacheQueue<T, U> {
  history: Map<string, ICachedResponse<T>> = new Map();
  queue: Map<string, ICallback<T, U>[]> = new Map();
  timeout: number;
  maxAge: number;

  constructor(timeout = 0, maxAge = 0) {
    this.timeout = timeout;
    this.maxAge = maxAge;
  }

  clearExpireHistory() {
    if (!this.history.size || !this.maxAge) {
      return;
    }

    const now = Date.now();
    for (const [key, { lastRequestTime, data }] of this.history) {
      if (now - lastRequestTime > this.maxAge && data) {
        this.history.delete(key);
      }
    }
  }

  remove(key: string, force = false) {
    this.queue.delete(key);

    if (force || !this.history.get(key)?.data) {
      this.history.delete(key);
    }
  }

  enqueue(key: string, timeout: (reject: (reason?: any) => void) => void) {
    return new Promise<T>((resolve, reject) => {
      const delay = this.timeout;
      let timer: NodeJS.Timeout | undefined;
      if (delay) {
        timer = setTimeout(() => {
          this.remove(key);
          timeout(reject);
        }, delay);
      }

      const callback = (data?: T, error?: U) => {
        timer && clearTimeout(timer);
        data ? resolve(deepClone(data)) : reject(deepClone(error));
      };

      if (!this.queue.has(key)) {
        this.queue.set(key, []);
      }
      this.queue.get(key)!.push(callback);
    });
  }

  dequeue(key: string, data: T): void;
  dequeue(key: string, data: undefined, error: U): void;
  dequeue(key: string, data?: T, error?: U): void {
    if (this.queue.has(key)) {
      for (const callback of this.queue.get(key)!) {
        callback(data, error);
      }
    }

    this.remove(key);
  }
}
