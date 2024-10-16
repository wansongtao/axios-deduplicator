import type { AxiosError, AxiosResponse, AxiosRequestConfig } from 'axios';

export type ICallback = (data?: AxiosResponse, error?: AxiosError) => void;

export interface IOptions<
  T extends AxiosRequestConfig = AxiosRequestConfig,
  U extends AxiosError = AxiosError,
  V extends AxiosResponse = AxiosResponse
> {
  timeout?: number;
  repeatWindowMs: number;
  generateRequestKey: (config: T) => string;
  isAllowRepeat?: (config: T) => boolean;
  isCache(error: U): boolean;
  isCache(error: undefined, res: V): boolean;
  isCache?: (error?: U, res?: V) => boolean;
}

export interface ICachedResponse {
  data?: AxiosResponse;
  lastRequestTime: number;
}
