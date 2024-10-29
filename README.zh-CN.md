[English](./README.md) | 简体中文
# AXIOS-DEDUPLICATOR

## 描述

这是一个简单的库，允许您去重 axios 请求。当您有多个相同的请求并且希望避免多次发出相同的请求时，它非常有用。它会在请求之前检查是否有相同的请求，如果有，则会返回相同的 Promise。

## 安装

```bash
npm install axios-deduplicator

pnpm add axios-deduplicator
```

## 使用

### 基本用法

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

### 自定义唯一标识

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

### 使用 AxiosDeduplicator 类

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

## 接口

### createAxiosDeduplicatorInstance([options])

创建一个 AxiosDeduplicator 实例。  

如果提供了 `options`，则它应该是一个对象，可以包含以下属性：

- `options.repeatWindowMs`：一个数字，表示重复窗口的毫秒数。如果在 `repeatWindowMs` 毫秒内发出了相同的请求，则会直接返回相同的 Promise，不会向服务器发送实际请求。默认值为 `0`，这时只有在第一个请求还未响应之前，发送的相同请求才会被去重（当第一个请求响应时，直接分发响应结果给其他相同请求）；
- `options.generateRequestKey(config: AxiosRequestConfig)`：一个函数，用于生成请求的唯一标识。默认情况下，它会使用请求的 URL、方法和数据作为唯一标识。如果您希望自定义唯一标识，可以提供此函数。它应该接受一个参数，该参数是请求的配置对象，返回一个字符串，表示请求的唯一标识；
- `options.timeout`: 一个数字，表示请求超时时间。默认值为 `undefined`，表示不设置超时时间；
- `options.isAllowRepeat(config: AxiosRequestConfig)`: 一个函数，用于判断是否允许重复请求。默认情况下，它会返回 `false`，表示不允许重复请求。如果您希望自定义是否允许重复请求，可以提供此函数。它应该接受一个参数，该参数是请求的配置对象，返回一个布尔值，表示是否允许重复请求；
- `options.isDeleteCached(err?: AxiosError, res?: AxiosResponse)`: 一个函数，用于判断是否删除缓存，删除缓存后可立即发起相同请求且不会被去重。默认任何情况下都不删除缓存。如果您希望自定义是否删除缓存，可以提供此函数。它应该接受两个参数，第一个参数是请求错误对象，第二个参数是请求响应对象，返回一个布尔值，表示是否删除缓存；
- `options.started(key: string, config: AxiosRequestConfig)`: 一个函数，在去重开始时执行。默认情况下，它不做任何事情。如果您希望进行性能分析，可以提供此函数。它应该接受两个参数，第一个参数是请求的唯一标识，第二个参数是请求的配置对象；
- `options.completed(key: string, config: AxiosRequestConfig)`: 一个函数，在去重完成时执行。默认情况下，它不做任何事情。如果您希望进行性能分析或记录去重次数，可以提供此函数。它应该接受两个参数，第一个参数是请求的唯一标识，第二个参数是请求的配置对象。

### AxiosDeduplicator

`AxiosDeduplicator` 类，用于去重 axios 请求。实例化时接受一个可选的 `options` 对象，该对象的属性与 `createAxiosDeduplicatorInstance` 的 `options` 属性相同。

## 许可证

[MIT](./LICENSE)
