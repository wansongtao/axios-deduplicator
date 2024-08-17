import type { AxiosRequestConfig, AxiosResponse } from 'axios';

class AxiosDeduplicator {
  private static KEY = 'axios-deduplicator';
  private static CODE = 'ECONNABORTED';
}

const t = new AxiosDeduplicator();
console.log(t, 't');

