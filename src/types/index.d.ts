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
  isDeleteCached?: (error?: U, res?: V) => boolean;
  started?: (key: string, config: T) => void;
  completed?: (key: string, config: T) => void;
}

export interface ICachedResponse {
  data?: AxiosResponse;
  lastRequestTime: number;
}
