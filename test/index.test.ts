import createAxiosDeduplicatorInstance from '../src/index';
import axios, { AxiosResponse } from 'axios';
import { describe, expect, test, beforeEach } from 'vitest';

describe('Test the default behavior of the plugin', () => {
  let axiosDeduplicator: ReturnType<typeof createAxiosDeduplicatorInstance>;
  let requestInstance = axios.create({
    timeout: 1000
  });

  beforeEach(() => {
    axiosDeduplicator = createAxiosDeduplicatorInstance();
    requestInstance.interceptors.request.use(
      axiosDeduplicator.requestInterceptor
    );
    requestInstance.interceptors.response.use(
      axiosDeduplicator.responseInterceptorFulfilled,
      axiosDeduplicator.responseInterceptorRejected
    );
  });

  test('Test whether duplicate requests can be prevented', async () => {
    const url = 'https://jsonplaceholder.typicode.com/todos/1';
    const request1 = requestInstance.get(url);
    const request2 = requestInstance.get(url);

    const [response1, response2] = await Promise.all([request1, request2]);

    expect(response1.data).toEqual(response2.data);
  });

  test('Test that different requests are not deduplicated', async () => {
    const url1 = 'https://jsonplaceholder.typicode.com/todos/1';
    const url2 = 'https://jsonplaceholder.typicode.com/todos/2';
    const request1 = requestInstance.get(url1);
    const request2 = requestInstance.get(url2);

    const [response1, response2] = await Promise.all([request1, request2]);

    expect(response1).not.toEqual(response2);
  });

  test('Test that requests with different parameters are not deduplicated', async () => {
    const url = 'https://jsonplaceholder.typicode.com/todos/1';
    const request1 = requestInstance.get(url, {
      params: { a: 1 },
      data: { a: 1 }
    });
    const request2 = requestInstance.get(url, {
      params: { a: 2 },
      data: { a: 2 }
    });

    const [response1, response2] = await Promise.all([request1, request2]);

    expect(response1).not.toEqual(response2);
  });

  test('Test whether duplicate requests with the same formdata parameters can be prevented', async () => {
    const url = 'https://jsonplaceholder.typicode.com/todos/1';
    const formData = new FormData();
    formData.append('a', '1');
    formData.append('b', new Blob(['test']));
    const request1 = requestInstance.get(url, { data: formData });
    const request2 = requestInstance.get(url, { data: formData });

    const [response1, response2] = await Promise.all([request1, request2]);

    expect(response1.data).toEqual(response2.data);
  });

  test('Test the handling of failed requests', async () => {
    const url = 'https://jsonplaceholder.typicode.com/invalid-url';
    try {
      await requestInstance.get(url);
    } catch (error) {
      expect(error).toBeDefined();
    }
  });
});

describe('Test the custom behavior of the plugin', () => {
  let axiosDeduplicator: ReturnType<typeof createAxiosDeduplicatorInstance>;
  let instance = axios.create({
    timeout: 1000
  });

  beforeEach(() => {
    axiosDeduplicator = createAxiosDeduplicatorInstance({
      timeout: 1000,
      repeatWindowMs: 3000,
      generateRequestKey: (config) => {
        return config.url!;
      },
      isAllowRepeat: (config) => config.headers?.allowRepeat,
      isDeleteCached: (_err, res) => {
        return res?.data.id === 3;
      }
    });
    instance.interceptors.request.use(axiosDeduplicator.requestInterceptor);
    instance.interceptors.response.use(
      axiosDeduplicator.responseInterceptorFulfilled,
      axiosDeduplicator.responseInterceptorRejected
    );
  });

  test('Test whether duplicate requests can be prevented', async () => {
    const url = 'https://jsonplaceholder.typicode.com/todos/4';
    const request1 = instance.get(url);
    const request2 = () => {
      return new Promise<AxiosResponse>((resolve) => {
        setTimeout(() => {
          instance
            .get(url)
            .then((res) => {
              resolve(res);
            })
            .catch(resolve);
        }, 500);
      });
    };

    const [response1, response2] = await Promise.all([request1, request2()]);

    expect(response1.data).toEqual(response2.data);
  });

  test('Test whether duplicate requests can be allowed', async () => {
    const url = 'https://jsonplaceholder.typicode.com/todos/1';
    const request1 = instance.get(url);
    const request2 = instance.get(url, { headers: { allowRepeat: true } });

    const [response1, response2] = await Promise.all([request1, request2]);

    expect(response1).not.toEqual(response2);
  });

  test('Test whether the cache can be skipped when the request is successful', async () => {
    const url = 'https://jsonplaceholder.typicode.com/todos/3';
    const request1 = instance.get(url);
    const request2 = () => {
      return new Promise((resolve) => {
        setTimeout(() => {
          instance
            .get(url)
            .then((res) => {
              resolve(res);
            })
            .catch(resolve);
        }, 0);
      });
    };

    const [response1, response2] = await Promise.all([request1, request2()]);

    expect(response1).not.toEqual(response2);
  });

  test('Test whether the cache can be used correctly', async () => {
    const url = 'https://jsonplaceholder.typicode.com/todos/5';

    const request1 = instance.get(url);
    const request2 = () => {
      return new Promise<AxiosResponse>((resolve) => {
        setTimeout(() => {
          instance
            .get(url)
            .then((res) => {
              resolve(res);
            })
            .catch(resolve);
        }, 1000);
      });
    };

    const [response1, response2] = await Promise.all([request1, request2()]);

    expect(response1.data).toEqual(response2.data);
  });
});
