/* eslint-disable */
"use strict";

/**
 * Module dependencies.
 */

const debug = require("debug")("koa:application");
const onFinished = require("./on-finished"); // const onFinished = require('on-finished') 引用自己的 on-finished
const response = require("./response");
const compose = require("./koa-compose"); // const compose = require('koa-compose') 引用自己的 koa-compose
const context = require("./context");
const request = require("./request"); // request对象
const statuses = require("statuses");
const Emitter = require("events"); // nodeJs中的事件触发器 -> events
const util = require("util"); // nodeJs中的使用工具 -> util
const Stream = require("stream");
const http = require("http");
const only = require("only");
const { HttpError } = require("http-errors");

/**
 * Expose `Application` class.
 * Inherits from `Emitter.prototype`.
 */

module.exports = class Application extends Emitter {
  /**
   * Initialize a new `Application`.
   *
   * @api public
   */

  /**
   *
   * @param {object} [options] Application options
   * @param {string} [options.env='development'] Environment
   * @param {string[]} [options.keys] Signed cookie keys
   * @param {boolean} [options.proxy] Trust proxy headers
   * @param {number} [options.subdomainOffset] Subdomain offset
   * @param {string} [options.proxyIpHeader] Proxy IP header, defaults to X-Forwarded-For
   * @param {number} [options.maxIpsCount] Max IPs read from proxy IP header, default to 0 (means infinity)
   *
   */

  constructor(options) {
    super();
    options = options || {}; // -------------------------------------------- 配置项
    this.proxy = options.proxy || false; // -------------------------------- 是否是 proxy 模式
    this.subdomainOffset = options.subdomainOffset || 2; // ---------------- domain要忽略的偏移量
    this.proxyIpHeader = options.proxyIpHeader || "X-Forwarded-For"; // ---- proxy自定义header
    this.maxIpsCount = options.maxIpsCount || 0; // ------------------------ 代理服务器数量
    this.env = options.env || process.env.NODE_ENV || "development"; // ---- 环境变量
    if (options.keys) this.keys = options.keys; // ------------------------- 自定义 cookie 密钥
    this.middleware = []; // ----------------------------------------------- 中间件

    this.context = Object.create(context);
    // 1
    // context
    // - context，通过context原型对象生成新的实例对象，Object.create(context)，则每个实例之间互不影响
    // - 这里用Object.create是因为我们在同一个应用中可能会有多个new Koa的app，为了防止这些app相互污染，用拷贝的方法让其引用不指向同一个地址

    this.request = Object.create(request); // request
    this.response = Object.create(response); // response

    // util.inspect.custom support for node 6+
    /* istanbul ignore else */
    if (util.inspect.custom) {
      // 自定义检查，这里的作用是get app时，去执行this.inspect
      this[util.inspect.custom] = this.inspect;
    }
  }

  /**
   * Shorthand for:
   *
   *    http.createServer(app.callback()).listen(...)
   *
   * @param {Mixed} ...
   * @return {Server}
   * @api public
   */
  // ------------------------------------------------------------------------------------------------------------------- listen
  // app.listen(3000)
  listen(...args) {
    debug("listen");
    const server = http.createServer(this.callback());
    return server.listen(...args);
    // 1
    // http.createServer -> 是node.js提供的原生api
    // 官网说明：http://nodejs.cn/api/http.html#http_http_createserver_options_requestlistener
  }

  /**
   * Return JSON representation.
   * We only bother showing settings.
   *
   * @return {Object}
   * @api public
   */

  toJSON() {
    return only(this, ["subdomainOffset", "proxy", "env"]);
  }

  /**
   * Inspect implementation.
   *
   * @return {Object}
   * @api public
   */

  inspect() {
    return this.toJSON();
  }

  /**
   * Use the given middleware `fn`.
   *
   * Old-style middleware will be converted.
   *
   * @param {Function} fn
   * @return {Application} self
   * @api public
   */
  // ------------------------------------------------------------------------------------------------------------------- use
  // use -> app.use
  // 1
  /*
    const Koa = require('koa');
    const app = new Koa();
    app.use(async ctx => { ctx.body = 'Hello World' });
    app.use(async (ctx, next) => {});
    app.listen(3000);
  */
  use(fn) {
    if (typeof fn !== "function")
      throw new TypeError("middleware must be a function!");
    debug("use %s", fn._name || fn.name || "-");
    this.middleware.push(fn);
    return this;
  }

  /**
   * Return a request handler callback
   * for node's native http server.
   *
   * @return {Function}
   * @api public
   */
  // ------------------------------------------------------------------------------------------------------------------- callback
  callback() {
    const fn = compose(this.middleware);

    if (!this.listenerCount("error")) this.on("error", this.onerror);
    // 1
    // this.on() 是继承了 Emitter 类中的 on 方法
    // emitter.on(eventName, listener)
    // - eventName 事件的名称
    // - listener 回调函数

    const handleRequest = (req, res) => {
      const ctx = this.createContext(req, res);
      return this.handleRequest(ctx, fn);
    };

    return handleRequest;
  }

  /**
   * Handle request in callback.
   *
   * @api private
   */

  // ------------------------------------------------------------------------------------------------------------------- handleRequest
  // handleRequest
  // - 调用顺序：app.listen() ---> callback() ---> handleRequest() ---> 中间件fn(ctx).then(handleResponse).catch(onerror)
  // 1
  // fnMiddleware(ctx).then(handleResponse).catch(onerror)
  // 2
  // fnMiddleware
  // - fnMiddleware = compose(this.middleware) = function (context, next) =>  dispatch(0)
  // 3
  // dispatch
  /*
    function dispatch(i) {
      if (i <= index) {
        return Promise.reject(new Error("next() called multiple times"));
      }
      index = i;
      let fn = middleware[i];
      if (i === middleware.length) fn = next;
      if (!fn) return Promise.resolve();
      try {
        return Promise.resolve(fn(context, dispatch.bind(null, i + 1)));
      } catch (err) {
        return Promise.reject(err);
      }
    }
  */
  // 4
  // 中间件 - 具体的执行过程
  // 1. fnMiddleware(ctx).then(handleResponse).catch(onerror)
  // 2. (function (context, next) =>  dispatch(0)).then(handleResponse).catch(onerror)
  // 3. dispatch(0).then(handleResponse).catch(onerror)
  // 4. Promise.resolve(middlewareFn0(context, dispatch.bind(null,1)))
  // 5. Promise.resolve(async(ctx, dispatch) => {... dispatch(1) ...})
  // 6. 最终形态如下
  /**
   * const [fn1, fn2, fn3] = this.middleware()
   * const fnMiddleware = function(context, next) {
   *    return Promise.resolve(fn1(context, function next1() {
   *      return Promise.resolve(fn2(context, function next2() { // 每个中间件，如果存在next就return Promise.resolve(fn(context, dispatch.bind(null, i + 1)))，不存在就 return Promise.resolve()
   *        return Promise.resolve(fn3(context, function next3() { // 最后一个中间件没有next函数了，因为已经是最后一个
   *          return Promise.resolve()
   *        }))
   *      }))
   *    }))
   * }
   **/
  // 7. 执行的最终状态如下
  /**
   * fn1(async (ctx, fn2) => {
   *     console.log('中间件1，next前')
   *     fn2(async (ctx, fn3) => {
   *         console.log('中间件2，next前')
   *         fn3(ctx) => {
   *            console.lo('中间件3')
   *         }
   *         console.log('中间件2，next前后)
   *     })
   *     console.log('中间件1，next后')
   * })
   */
  handleRequest(ctx, fnMiddleware) {
    const res = ctx.res;
    res.statusCode = 404;
    const onerror = (err) => ctx.onerror(err);
    const handleResponse = () => respond(ctx);
    onFinished(res, onerror); // 主要作用：当 HTTP 请求关闭、完成或出错时执行回调
    return fnMiddleware(ctx).then(handleResponse).catch(onerror);
  }

  /**
   * Initialize a new context.
   *
   * @api private
   */

  // ------------------------------------------------------------------------------------------------------------------- createContext
  // createContext -> 返回一个 context 对象
  // 1
  // ctx对象上具有哪些属性
  // - ctx.app -> app属性指的是const app = new Koa() 生成的koa实例
  // - ctx.req
  // - ctx.res
  // - ctx.request
  // - ctx.response
  // - ctx.originalUrl
  // - ctx.state
  // 2
  // - 1
  // - 问题：app上有哪些属性？ const app = new Koa()
  // - 回答：
  // app.env -----------> 环境变量 -> 默认是 NODE_ENV 或 'development'
  // app.keys ----------> 签名的cookie密钥数组
  // app.proxy ---------> 当真正的代理头字段将被信任时忽略 `.subdomains` 的 `app.subdomainOffset` 偏移量，默认为 2
  // app.proxyIpHeader -> 代理ip消息头
  // app.maxIpCount ----> 从代理ip消息头读取的最大ips，默认是0表示无限
  // - 2
  // - 问题：如何设置这些属性
  // - 回答：有两种方法
  //   - 1. 通过参数来设置： const app = new Koa({proxy: true})
  //   - 2. 动态来设置：app.proxy = true
  createContext(req, res) {
    const context = Object.create(this.context); // 以 this.context 为原型对象，生成实例对象

    const request = (context.request = Object.create(this.request));
    const response = (context.response = Object.create(this.response));

    // context
    context.app = request.app = response.app = this;
    context.req = request.req = response.req = req;
    context.res = request.res = response.res = res;

    // request response
    request.ctx = response.ctx = context;
    request.response = response;
    response.request = request; // request 和 response 相互引用

    // context
    context.originalUrl = request.originalUrl = req.url;
    context.state = {};

    return context;
  }

  /**
   * Default error handler.
   *
   * @param {Error} err
   * @api private
   */

  // ------------------------------------------------------------------------------------------------------------------- onerror
  // onerror 处理错误
  onerror(err) {
    // When dealing with cross-globals a normal `instanceof` check doesn't work properly. 处理跨全局时，正常的'instanceof'检查无法正常工作
    // See https://github.com/koajs/koa/issues/1466
    // We can probably remove it once jest fixes https://github.com/facebook/jest/issues/2549.
    const isNativeError = // 原生错误类型
      Object.prototype.toString.call(err) === "[object Error]" ||
      err instanceof Error;

    if (!isNativeError)
      throw new TypeError(util.format("non-error thrown: %j", err));
    // format
    // util.format(format[, ...args]) 格式化字符串
    // - util.format() 方法使用第一个参数作为类似 printf 的格式字符串（其可以包含零个或多个格式说明符）来返回格式化的字符串。 每个说明符都替换为来自相应参数的转换后的值

    if (err.status === 404 || err.expose) return;
    // 1
    // err.expose -> 决定是否返回错误详情给客户端

    if (this.silent) return;
    // silent 沉默的的意思

    const msg = err.stack || err.toString();
    console.error(`\n${msg.replace(/^/gm, "  ")}\n`);
  }

  /**
   * Help TS users comply to CommonJS, ESM, bundler mismatch.
   * @see https://github.com/koajs/koa/issues/1513
   */

  static get default() {
    return Application;
  }
};

/**
 * Response helper.
 */
// ------------------------------------------------------------------------------------------------------------------- respond
// respond
function respond(ctx) {
  // allow bypassing koa
  if (ctx.respond === false) return;

  if (!ctx.writable) return;

  const res = ctx.res;
  let body = ctx.body;
  const code = ctx.status;

  // ignore body
  if (statuses.empty[code]) {
    // strip headers
    ctx.body = null;
    return res.end();
  }

  if (ctx.method === "HEAD") {
    if (!res.headersSent && !ctx.response.has("Content-Length")) {
      const { length } = ctx.response;
      if (Number.isInteger(length)) ctx.length = length;
    }
    return res.end();
  }

  // status body
  if (body == null) {
    if (ctx.response._explicitNullBody) {
      ctx.response.remove("Content-Type");
      ctx.response.remove("Transfer-Encoding");
      ctx.length = 0;
      return res.end();
    }
    if (ctx.req.httpVersionMajor >= 2) {
      body = String(code);
    } else {
      body = ctx.message || String(code);
    }
    if (!res.headersSent) {
      ctx.type = "text";
      ctx.length = Buffer.byteLength(body);
    }
    return res.end(body);
  }

  // responses
  if (Buffer.isBuffer(body)) return res.end(body);
  if (typeof body === "string") return res.end(body);
  if (body instanceof Stream) return body.pipe(res);

  // body: json
  body = JSON.stringify(body);
  if (!res.headersSent) {
    ctx.length = Buffer.byteLength(body);
  }
  res.end(body);
}

/**
 * Make HttpError available to consumers of the library so that consumers don't
 * have a direct dependency upon `http-errors`
 */

module.exports.HttpError = HttpError;
