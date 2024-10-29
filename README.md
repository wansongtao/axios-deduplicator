English | [简体中文](./README.zh-CN.md)

# AXIOS-DEDUPLICATOR

## Description

This is a simple library that allows you to deduplicate axios requests. It is useful when you have multiple requests that are the same and you want to avoid making the same request multiple times. It will check if there is a same request before making the request, and if there is, it will return the same Promise.

## Installation

```bash
npm install axios-deduplicator

pnpm add axios-deduplicator
```

## Usage

### Basic Usage

```javascript
import axios from 'axios';
import createAxiosDeduplicatorInstance from 'axios-deduplicator';

const axiosDeduplicator = createAxiosDeduplicatorInstance();

const axiosInstance = axios.create();
axiosInstance.interceptors.request.use(axiosDeduplicator.requestInterceptor);
axiosInstance.interceptors.response.use(
  axiosDeduplicator.responseInterceptorFulfilled,
  axiosDeduplicator.responseInterceptorRejected
);
```

### Custom Unique Identifier

```javascript
import axios from 'axios';
import createAxiosDeduplicatorInstance from 'axios-deduplicator';

const axiosDeduplicator = createAxiosDeduplicatorInstance({
  generateRequestKey(config) {
    return config.url;
  }
});

const axiosInstance = axios.create();
axiosInstance.interceptors.request.use(axiosDeduplicator.requestInterceptor);
axiosInstance.interceptors.response.use(
  axiosDeduplicator.responseInterceptorFulfilled,
  axiosDeduplicator.responseInterceptorRejected
);
```

### Using AxiosDeduplicator Class

```javascript
import axios from 'axios';
import { AxiosDeduplicator } from 'axios-deduplicator';

const axiosDeduplicator = new AxiosDeduplicator();

const axiosInstance = axios.create();
axiosInstance.interceptors.request.use(axiosDeduplicator.requestInterceptor.bind(axiosDeduplicator));
axiosInstance.interceptors.response.use(
  axiosDeduplicator.responseInterceptorFulfilled.bind(axiosDeduplicator),
  axiosDeduplicator.responseInterceptorRejected.bind(axiosDeduplicator)
);
```

## API

### `createAxiosDeduplicatorInstance(options)`

Creates an instance of AxiosDeduplicator.

#### Parameters

- `options` (`Object`): The options object.
  - `repeatWindowMs`: A number representing the milliseconds of the repeat window. If an identical request is made within repeatWindowMs milliseconds, the same Promise will be returned directly without sending an actual request to the server. The default value is 0, which means deduplication only occurs when identical requests are made before the first request responds (when the first request responds, its result is distributed to other identical requests);
  - `generateRequestKey(config: AxiosRequestConfig)`: A function used to generate a unique identifier for the request. By default, it uses the request's URL, method, and data as the unique identifier. If you want to customize the unique identifier, you can provide this function. It should accept one parameter, which is the request configuration object, and return a string representing the unique identifier for the request;
  - `timeout`: A number representing the request timeout duration. The default value is undefined, indicating no timeout is set;
  - `isAllowRepeat(config: AxiosRequestConfig)`: A function used to determine whether duplicate requests are allowed. By default, it returns false, indicating duplicate requests are not allowed. If you want to customize whether duplicate requests are allowed, you can provide this function. It should accept one parameter, which is the request configuration object, and return a boolean indicating whether duplicate requests are allowed;
  - `isDeleteCached(err?: AxiosError, res?: AxiosResponse)`: A function used to determine whether to delete the cache, after which identical requests can be made immediately without deduplication. By default, the cache is never deleted. If you want to customize whether to delete the cache, you can provide this function. It should accept two parameters: the first is the request error object, and the second is the request response object, returning a boolean indicating whether to delete the cache;
  - `started(key: string, config: AxiosRequestConfig)`: A function executed when deduplication begins. By default, it does nothing. If you want to perform performance analysis, you can provide this function. It should accept two parameters: the first is the request's unique identifier, and the second is the request configuration object;
  - `completed(key: string, config: AxiosRequestConfig)`: A function executed when deduplication completes. By default, it does nothing. If you want to perform performance analysis or record the number of deduplications, you can provide this function. It should accept two parameters: the first is the request's unique identifier, and the second is the request configuration object.

### `AxiosDeduplicator`

The class of AxiosDeduplicator. It is used to deduplicate requests. You can create an instance of AxiosDeduplicator and use its methods as interceptors for axios.

## License

[MIT](./LICENSE)
