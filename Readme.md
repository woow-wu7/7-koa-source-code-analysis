# koa-源码分析

### 文章
- [koa源码分析 - 掘金文章]()
- [koa源码分析 - 思维导图]()


### KOA源码目录结构说明
```
1. 入口文件
- 在package.json中通过 `main` 属性得知入口文件是 `lib/application.js`

2. 核心文件
- 核心文件都在 `lib` 文件夹中
- lib/application.js --> 主要就是Koa类相关代码，即 new Koa()
- lib/context.js ------> 是context对象相关
- lib/request.js ------> request相关
- bli/response.js -----> response相关

3. 依赖
- koa-compose ---------> 处理中间件
- on-finished ---------> 主要作用：当 HTTP 请求关闭、完成或出错时执行回调
```



### (1) 如何调试koa源码
- 本项目已经做好了调试配置，只需要执行 `cnpm run dev` 断点调试 `index.js` 文件即可
```
1. 克隆koa源码：git clone git@github.com:koajs/koa.git
2. 安装依赖：cnpm install
3. 新建 index.js，并写入示例代码
4. 在 `vscode` 中选择 `运行和调试`， 新建 `launch.json` ，选择 `node`，并做如下配置
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "启动程序",
      "skipFiles": [
        "<node_internals>/**"
      ],
      "program": "${workspaceFolder}/index.js"
    }
  ]
}
5. 启动项目：node index.js
6. 在index.js中打断点，通过 `运行和调试` 菜单中的 `开始调试` 按钮进行断点吊饰即可
```



### (2) 测试
- 中间件
  - 中间件执行顺序测试  `cnpm run order`
  - 中间键执行顺序测试，对应文件 `test/index-order-test.js`
- node.js
  - http.createServer `cnpm run createServer`
  - http.createServe，对用文件 `test/createServer`
- node.js事件循环顺序
  - process.nextTick() `cnpm run eventLoop`



### (3) 中间件
- 调用顺序：app.listen() ---> callback() ---> handleRequest() ---> 中间件fn(ctx).then(handleResponse).catch(onerror)
- fnMiddleware = compose(this.middleware) = function (context, next) =>  dispatch(0)
```
中间件 - 具体的执行过程
1. fnMiddleware(ctx).then(handleResponse).catch(onerror)
2. (function (context, next) =>  dispatch(0)).then(handleResponse).catch(onerror)
3. dispatch(0).then(handleResponse).catch(onerror)
4. Promise.resolve(middlewareFn0(context, dispatch.bind(null,1)))
5. Promise.resolve(async(ctx, dispatch) => {... dispatch(1) ...})
6. 最终形态如下
const [fn1, fn2, fn3] = this.middleware()
const fnMiddleware = function(context, next) {
  return Promise.resolve(fn1(context, function next1() {
    return Promise.resolve(fn2(context, function next2() { // 每个中间件，如果存在next就return Promise.resolve(fn(context, dispatch.bind(null, i + 1)))，不存在就 return Promise.resolve()
      return Promise.resolve(fn3(context, function next3() { // 最后一个中间件没有next函数了，因为已经是最后一个
        return Promise.resolve()
      }))
    }))
  }))
}

7. fnMiddleware() 执行的最终状态如下
- 7.1
app.use(async (ctx, next) => {
  console.log(1);
  await next();
  console.log(2);
});
app.use(async (ctx, next) => {
  console.log(3);
  await next();
  console.log(4);
});
app.use(async (ctx, next) => {
  console.log(5);
  ctx.body = "测试中间执行顺序";
});
- 7.2
fnMiddleware() => Promise.resolve(
  // fn1()
  console.log(1)
  await Promise.resolve( // next()
    // fn2()
    console.log(3)
    await Promise.resolve( // next()
      // fn3()
      console.log(5)
      return Promise.resolve()
    )
    console.log(4)
  )
  console.log(2)
)
.then(handleResponse)
.catch(onerror)

// 13542
```



### (4) nodejs事件轮询
```
2
process.nextTick
函数签名：process.nextTick(callback[, ...args])
作用：微任务 - 在同步方法执行完毕后，下一轮事件循环中的开始执行
特点：
  - 执行时机在同步任务之后，在异步任务宏任务setTimeout之前
  - 其实process.nextTick()会在node事件循环的各个周期优先执行
参数：
  - 1. callback回调函数
  - 2. args当调用callback时要传入的额外参数


3
node.js事件轮训机制 - 一共分为6个阶段
(1) timers 定时器阶段
- ( 计时 ) 和 ( 执行到点的定时器 )
(2) pending callbacks 阶段
- 执行某些系统操作的回调函数，比如 ( tcp错误类型 )
(3) idle, prepare 阶段
- 一些准备工作
(4) poll轮询阶段，是一个轮询队列
- 1. 如果 ( 轮询队列不为空 )，依次取出执行，直到 ( 轮询队列为空 ) 或者 ( 达到系统最大限制 )
- 2. 如果 ( 轮询队列为空 )
     - 1. 如果之前设置过 ( setImmediate ) 函数，则直接进入下一个阶段 ( check阶段 )
     - 2. 如果之前没有设置过setImmediate函数，则会在当前poll阶段 ( 等待 )
          - 直到 ( 轮询队列 ) 添加进了新的回调函数，那么就会进入(4)阶段1的判断，继续执行
          - 或者 ( 定时器 ) 到点了，也会进入下一个阶段 ( check阶段 )
(5) check 阶段
- 执行 ( setImmediate ) 回调函数
(6) close callbacks 阶段
- 执行 ( close ) 事件回调函数
-------> 注意点：process.nextTick() 会在nodejs事件轮询的 ( 任意阶段，优先执行 )


---
案例
console.log(1);  // 同步任务
setTimeout(() => console.log(2)); // timer阶段执行 - nodejs事件轮询的第 1 个阶段
setTimeout(() => console.log(8), 0); // timer阶段执行 - nodejs事件轮询的第 1 个阶段
process.nextTick((n) => console.log(n), 3); // --- 在 node.js 事件轮询的 ( 任意阶段，优先执行 )，即在同步任务执行完毕后，优先执行
setImmediate(() => console.log(4)); // check阶段执行 - nodejs事件轮询的第 5 个阶段
new Promise((resolve) => {
  console.log(5); // 同步任务
  resolve();
  console.log(7); // 同步任务
}).then((res) => console.log(6)); // --- 微任务
// 执行顺序 1 5 7 3 6 2 8 4
// 同步任务 1 5 7
// 异步任务(微任务) 3 6
// 异步任务(宏任务) 2 8 4
```
