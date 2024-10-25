import { getDataType } from '../utils';

import type {
  AxiosError,
  AxiosRequestConfig,
  AxiosResponse,
  InternalAxiosRequestConfig
} from 'axios';
import type { ICallback, IOptions, ICachedResponse } from '../types';

export default class AxiosDeduplicator {
  static CODE = 'ERR_REPEATED';
  histories: Map<string, ICachedResponse> = new Map();
  pendingQueue: Map<string, ICallback[]> = new Map();
  options: IOptions = {
    repeatWindowMs: 0,
    generateRequestKey: AxiosDeduplicator.generateRequestKey
  };

  constructor(config: Partial<IOptions> = {}) {
    this.options.timeout = config.timeout;
    this.options.isAllowRepeat = config.isAllowRepeat;
    this.options.isCache = config.isCache;

    if (config.generateRequestKey) {
      this.options.generateRequestKey = config.generateRequestKey;
    }
    if (config.repeatWindowMs) {
      this.options.repeatWindowMs = config.repeatWindowMs;
    }
  }

  static generateRequestKey(config: AxiosRequestConfig): string {
    const { method, url, data, params } = config;
    let key = `${method}-${url}`;

    try {
      switch (getDataType(data)) {
        case 'object':
          key += `-${JSON.stringify(data)}`;
          break;
        case 'formdata':
          for (const [k, v] of data.entries()) {
            if (v instanceof Blob) {
              continue;
            }
            key += `-${k}-${v}`;
          }
          break;
        default:
          break;
      }

      if (getDataType(params) === 'object') {
        key += `-${JSON.stringify(params)}`;
      }
    } catch (e) {
      /* empty */
    }

    return key;
  }

  clearExpiredHistories() {
    const now = Date.now();
    for (const [key, { lastRequestTime }] of this.histories) {
      if (now - lastRequestTime > this.options.repeatWindowMs!) {
        this.histories.delete(key);
      }
    }
  }

  private on(key: string, callback: ICallback) {
    if (!this.pendingQueue.has(key)) {
      this.pendingQueue.set(key, []);
    }

    this.pendingQueue.get(key)!.push(callback);
  }

  private remove(key: string) {
    this.pendingQueue.delete(key);
    this.clearExpiredHistories();
  }

  private emit(key: string, data: AxiosResponse): void;
  private emit(key: string, data: undefined, error: AxiosError): void;
  private emit(key: string, data?: AxiosResponse, error?: AxiosError): void {
    if (this.pendingQueue.has(key)) {
      for (const callback of this.pendingQueue.get(key)!) {
        callback(data, error);
      }
    }

    this.remove(key);
  }

  private addPending(key: string) {
    return new Promise<AxiosResponse>((resolve, reject) => {
      const delay = this.options.timeout;
      let timer: NodeJS.Timeout | undefined;
      if (delay) {
        timer = setTimeout(() => {
          reject({
            code: 'ERR_CANCELED',
            message: 'Request timeout'
          });
        }, delay);
      }

      const callback = (data?: AxiosResponse, error?: AxiosError) => {
        timer && clearTimeout(timer);
        data ? resolve(data) : reject(error);
      };

      this.on(key, callback);
    });
  }

  requestInterceptor(config: InternalAxiosRequestConfig) {
    const isAllowRepeat = this.options.isAllowRepeat
      ? this.options.isAllowRepeat(config)
      : false;

    if (isAllowRepeat) {
      return config;
    }

    const key = this.options.generateRequestKey(config);
    if (this.histories.has(key)) {
      return Promise.reject({
        code: AxiosDeduplicator.CODE,
        message: 'Request repeated',
        config
      });
    }

    this.histories.set(key, { lastRequestTime: Date.now() });
    return config;
  }

  responseInterceptorFulfilled(response: AxiosResponse) {
    const key = this.options.generateRequestKey(response.config);
    if (
      this.options.isCache &&
      this.options.isCache(undefined, response)
    ) {
      this.remove(key);
      return response;
    }

    const history = this.histories.get(key);
    if (history) {
      history.data = response;
    }

    this.emit(key, response);
    return response;
  }

  responseInterceptorRejected(error: AxiosError) {
    const key = this.options.generateRequestKey(error.config!);
    if (
      this.options.isCache &&
      this.options.isCache(error)
    ) {
      this.remove(key);
      return Promise.reject(error);
    }

    if (error.code === AxiosDeduplicator.CODE) {
      const history = this.histories.get(key);
      if (
        history &&
        history.data &&
        Date.now() - history.lastRequestTime < this.options.repeatWindowMs
      ) {
        return Promise.resolve(history.data);
      }

      return this.addPending(key);
    }

    this.emit(key, undefined, error);
    return Promise.reject(error);
  }
}
