import { CacheQueue } from './core/axios-deduplicator';
import { deepClone, generateKey } from './utils';

import type { IOptions } from './types';
import type { AxiosError, AxiosResponse, InternalAxiosRequestConfig } from 'axios';

export { CacheQueue, deepClone, generateKey };

export default function createAxiosDeduplicatorInstance(
  options: Partial<IOptions> = {}
) {
  if (!options.generateRequestKey) {
    options.generateRequestKey = generateKey;
  }
  if (options.repeatWindowMs === undefined) {
    options.repeatWindowMs = 0;
  }
  if (!options.skip && (options.isAllowRepeat || options.isDeleteCached)) {
    options.skip = (req, res, err) => {
      if (req && options.isAllowRepeat) {
        return options.isAllowRepeat(req);
      }

      if ((res || err) && options.isDeleteCached) {
        return options.isDeleteCached!(err, res);
      }

      return false;
    };
  }

  const instance = new CacheQueue(options.timeout, options.repeatWindowMs);
  const REPEATED_CODE = 'ERR_REPEATED';

  return {
    requestInterceptor(config: InternalAxiosRequestConfig) {
      const isSkip = options.skip ? options.skip(config) : false;
      if (isSkip) {
        return config;
      }

      const key = options.generateRequestKey!(config);
      const history = instance.history.get(key);
      if (
        history &&
        (!history.data ||
          Date.now() - history.lastRequestTime < options.repeatWindowMs!)
      ) {
        return Promise.reject({
          code: REPEATED_CODE,
          message: 'Request repeated',
          config
        });
      }

      instance.clearExpireHistory();
      instance.history.set(key, { lastRequestTime: Date.now() });
      return config;
    },
    responseInterceptorFulfilled(response: AxiosResponse) {
      const key = options.generateRequestKey!(response.config);
      if (options.skip && options.skip(undefined, response)) {
        instance.remove(key, true);
        return response;
      }

      const history = instance.history.get(key);
      if (options.repeatWindowMs && history) {
        history.data = deepClone(response);
      }

      instance.dequeue(key, response);
      return response;
    },
    responseInterceptorRejected(error: AxiosError) {
      const key = options.generateRequestKey!(error.config!);
      if (options.skip && options.skip(undefined, undefined, error)) {
        instance.remove(key, true);
        return Promise.reject(error);
      }

      if (error.code === REPEATED_CODE) {
        const history = instance.history.get(key);
        // 距离上次请求时间间隔不小于 repeatWindowMs，从缓存中取出请求结果
        if (history && history.data) {
          return Promise.resolve(deepClone(history.data));
        }

        // 上次请求还未完成，等待结果
        return instance.enqueue(key, (reject) => {
          reject({
            code: 'ERR_CANCELED',
            message: 'Request timeout'
          });
        });
      }

      instance.dequeue(key, undefined, error);
      return Promise.reject(error);
    }
  };
}
