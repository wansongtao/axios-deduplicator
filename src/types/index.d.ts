import type { AxiosError, AxiosResponse, AxiosRequestConfig } from 'axios';

export type ICallback = (data?: AxiosResponse, error?: AxiosError) => void;

export interface IOptions<
  T extends AxiosRequestConfig = AxiosRequestConfig,
  U extends AxiosError = AxiosError,
  V extends AxiosResponse = AxiosResponse
> {
  timeout?: number;
  generateRequestKey: (config: T) => string;
  isAllowRepeat?: (config: T) => boolean;
  deleteCurrentHistory?: (error?: U, res?: V) => boolean;
}
