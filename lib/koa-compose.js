/* eslint-disable */
"use strict";
/**
 * Expose compositor.
 */

module.exports = compose;

/**
 * Compose `middleware` returning
 * a fully valid middleware comprised
 * of all those which are passed.
 *
 * @param {Array} middleware
 * @return {Function}
 * @api public
 */
// ------------------------------------------------------------------------------------------------------------------- compose
// compose
// - 参数
//    - 中间价组成的数组，每个中间件必须是函数
// - 返回值
//    - 返回一个函数
function compose(middleware) {
  if (!Array.isArray(middleware))
    throw new TypeError("Middleware stack must be an array!"); // 参数必须是数组
  for (const fn of middleware) {
    if (typeof fn !== "function")
      throw new TypeError("Middleware must be composed of functions!"); // 每个中间件必须由函数组成
  }

  /**
   * @param {Object} context
   * @return {Promise}
   * @api public
   */

  return function (context, next) {
    // last called middleware #
    let index = -1;
    return dispatch(0);
    function dispatch(i) {
      // 调用时：dispatch(0)

      if (i <= index) {
        return Promise.reject(new Error("next() called multiple times"));
        // i <= index 证明next()方法被多次调用
        // dispatch(0)时得出: ( 0<=-1不成立 )
      }

      index = i;
      // 1
      // i = 0 --> index = i = 0

      let fn = middleware[i];
      // 1
      // middleware[0] 第一个中间件函数

      if (i === middleware.length) fn = next;
      // 当为最后一个中间件时，继续执行dispatch() --> fn=next=undefined --> return Promise.resolve()，
      // - next不存在，return Promise.resolve()
      // - next存在，则执行next(context, dispatch.bind(null, i+1))

      // fn不存在
      if (!fn) return Promise.resolve();

      // fn存在
      // 则继续往下执行
      try {
        return Promise.resolve(fn(context, dispatch.bind(null, i + 1)));
        // 返回Promise成功的结果 -> 即执行中间件，中间件返回值作为promise成功状态的结果值
        // 1
        // 中间件函数的结构
        // app.use(async (ctx, next) => { ... })
        // async (ctx, next) => {...}
        // 2
        // fn(context, dispatch.bind(null, i + 1)) ---> next() 其实就是这里的 dispatch() 函数 ---> i+1就是下一个中间件
      } catch (err) {
        return Promise.reject(err);
      }
    }
  };
}
