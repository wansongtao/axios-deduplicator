import type { AxiosError, AxiosResponse, AxiosRequestConfig } from 'axios';

export type ICallback = (data?: AxiosResponse, error?: AxiosError) => void;

export interface IOptions<
  T extends AxiosRequestConfig = AxiosRequestConfig,
  U extends AxiosError = AxiosError,
  V extends AxiosResponse = AxiosResponse
> {
  /**
   * 发起请求时间 - 上次相同请求完成时间 < repeatWindowMs，则视为重复请求。
   * 默认为 0ms，即上次请求还没完成，又发起相同请求，才视为重复请求。
   */
  repeatWindowMs: number;
  generateRequestKey: (config: T) => string;
  /**
   * 某些情况下，直接跳过，去重处理
   * @param config
   * @param res
   * @param error
   * @returns
   */
  skip?: (config?: T, res?: V, error?: U) => boolean;
  timeout?: number;

  isAllowRepeat?: (config: T) => boolean;
  isDeleteCached?: (error?: U, res?: V) => boolean;
  started?: (key: string, config: T) => void;
  completed?: (key: string, config: T) => void;
}

export interface ICachedResponse {
  data?: AxiosResponse;
  lastRequestTime: number;
}
