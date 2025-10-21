import { deepClone, getDataType } from '../utils';

import type {
  AxiosError,
  AxiosRequestConfig,
  AxiosResponse,
  InternalAxiosRequestConfig
} from 'axios';
import type { ICallback, IOptions, ICachedResponse } from '../types';

export default class AxiosDeduplicator {
  static CODE = 'ERR_REPEATED';
  history: Map<string, ICachedResponse> = new Map();
  queue: Map<string, ICallback[]> = new Map();
  options: IOptions = {
    repeatWindowMs: 0,
    generateRequestKey: AxiosDeduplicator.generateRequestKey
  };

  constructor(config: Partial<IOptions> = {}) {
    if (config.generateRequestKey) {
      this.options.generateRequestKey = config.generateRequestKey;
    }
    if (config.repeatWindowMs) {
      this.options.repeatWindowMs = config.repeatWindowMs;
    }
    this.options.timeout = config.timeout;
    if (config.skip) {
      this.options.skip = config.skip;
    } else if (config.isAllowRepeat || config.isDeleteCached) {
      this.options.skip = (req, res, err) => {
        if (req && config.isAllowRepeat) {
          return config.isAllowRepeat(req);
        }

        if ((res || err) && config.isDeleteCached) {
          return config.isDeleteCached!(err, res);
        }

        return false;
      };
    }

    // todo: 未来要移除掉的 api
    if (config.started) {
      this.options.started = config.started;
    }
    if (config.completed) {
      this.options.completed = config.completed;
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

  clearExpiredHistory() {
    const now = Date.now();
    for (const [key, { lastRequestTime }] of this.history) {
      if (now - lastRequestTime > this.options.repeatWindowMs!) {
        this.history.delete(key);
      }
    }
  }

  private remove(key: string) {
    this.queue.delete(key);
    this.clearExpiredHistory();
  }

  private emit(key: string, data: AxiosResponse): void;
  private emit(key: string, data: undefined, error: AxiosError): void;
  private emit(key: string, data?: AxiosResponse, error?: AxiosError): void {
    if (this.queue.has(key)) {
      for (const callback of this.queue.get(key)!) {
        callback(data, error);
      }
    }

    this.remove(key);
  }

  private enqueue(key: string) {
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
        this.options.completed &&
          this.options.completed(key, data ? data.config : error?.config!);
        data ? resolve(deepClone(data)) : reject(deepClone(error));
      };

      if (!this.queue.has(key)) {
        this.queue.set(key, []);
      }
      this.queue.get(key)!.push(callback);
    });
  }

  requestInterceptor(config: InternalAxiosRequestConfig) {
    const isSkip = this.options.skip ? this.options.skip(config) : false;
    if (isSkip) {
      return config;
    }

    const key = this.options.generateRequestKey(config);
    const history = this.history.get(key);
    if (
      history &&
      (!history.data ||
        Date.now() - history.lastRequestTime < this.options.repeatWindowMs)
    ) {
      this.options.started && this.options.started(key, config);

      return Promise.reject({
        code: AxiosDeduplicator.CODE,
        message: 'Request repeated',
        config
      });
    }

    this.history.set(key, { lastRequestTime: Date.now() });
    return config;
  }

  responseInterceptorFulfilled(response: AxiosResponse) {
    const key = this.options.generateRequestKey(response.config);
    if (this.options.skip && this.options.skip(undefined, response)) {
      this.remove(key);
      this.history.delete(key);
      return response;
    }

    const history = this.history.get(key);
    if (this.options.repeatWindowMs && history) {
      history.data = deepClone(response);

      setTimeout(() => {
        this.clearExpiredHistory();
      }, this.options.repeatWindowMs + 1000);
    }

    this.emit(key, response);
    return response;
  }

  responseInterceptorRejected(error: AxiosError) {
    const key = this.options.generateRequestKey(error.config!);
    if (this.options.skip && this.options.skip(undefined, undefined, error)) {
      this.remove(key);
      this.history.delete(key);
      return Promise.reject(error);
    }

    if (error.code === AxiosDeduplicator.CODE) {
      const history = this.history.get(key);
      // 距离上次请求时间间隔不小于 repeatWindowMs，从缓存中取出请求结果
      if (history && history.data) {
        this.options.completed && this.options.completed(key, error.config!);
        return Promise.resolve(deepClone(history.data));
      }

      // 上次请求还未完成，加入队列，等待结果
      return this.enqueue(key);
    }

    this.emit(key, undefined, error);
    return Promise.reject(error);
  }
}
