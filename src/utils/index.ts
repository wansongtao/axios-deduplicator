export const getDataType = (obj: unknown) => {
  let res = Object.prototype.toString.call(obj).split(' ')[1];
  res = res.substring(0, res.length - 1).toLowerCase();
  return res;
};

/**
 * 支持Map、Set、RegExp、Date、Function类型和循环引用，不支持symbol属性
 * @param obj 
 * @returns 
 */
export const deepClone = <T = unknown>(obj: T): T => {
  // 使用 WeakMap 解决循环引用问题，避免内存泄漏
  const visited = new WeakMap()

  const clone = (data: any): any => {
    if (data === null || typeof data !== 'object') {
      return data
    }

    // 检查循环引用
    if (visited.has(data)) {
      return visited.get(data)
    }

    let result: any

    // 获取数据类型
    const type = Object.prototype.toString.call(data)
    switch (type) {
      case '[object Date]':
        result = new Date(data.getTime())
        break

      case '[object RegExp]':
        result = new RegExp(data.source, data.flags)
        break

      case '[object Function]':
        // 优化函数克隆，减少字符串操作
        try {
          result = data.bind({})
        } catch {
          // 降级方案：对于箭头函数等特殊情况
          const funcStr = data.toString()
          if (funcStr.startsWith('function')) {
            result = new Function(`return ${funcStr}`)()
          } else {
            result = new Function(`return function ${funcStr.replace(/^function/, '')}`)()
          }
        }
        break

      case '[object Map]':
        result = new Map()
        visited.set(data, result)
        data.forEach((val: any, key: any) => {
          result.set(clone(key), clone(val))
        })
        return result

      case '[object Set]':
        result = new Set()
        visited.set(data, result)
        data.forEach((val: any) => {
          result.add(clone(val))
        })
        return result

      case '[object Array]':
        result = []
        visited.set(data, result)
        for (let i = 0; i < data.length; i++) {
          result[i] = clone(data[i])
        }
        return result

      default:
        // 处理普通对象
        result = {}
        visited.set(data, result)

        // 使用 Object.keys 而不是 for...in，性能更好
        const keys = Object.keys(data)
        for (let i = 0; i < keys.length; i++) {
          const key = keys[i]
          result[key] = clone(data[key])
        }
        return result
    }

    visited.set(data, result)
    return result
  }

  return clone(obj)
}
