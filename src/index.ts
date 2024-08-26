import AxiosDeduplicator from './core/axios-deduplicator';

import type { IOptions } from './types';

export default function createAxiosDeduplicatorInstance(
  options: Partial<IOptions> = {}
) {
  const instance = new AxiosDeduplicator(options);

  return {
    requestInterceptor: instance.requestInterceptor.bind(instance),
    responseInterceptorFulfilled:
      instance.responseInterceptorFulfilled.bind(instance),
    responseInterceptorRejected:
      instance.responseInterceptorRejected.bind(instance)
  };
}
