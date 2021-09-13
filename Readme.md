# koa-源码分析


#### (1) 如何调试koa源码
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

#### (2) 测试
- 中间件
  - 中间件执行顺序测试  `cnpm run order`
  - 中间键执行顺序测试，对应文件 `test/index-order-test.js`
- node.js
  - http.createServer `cnpm run createServer`
  - http.createServe，对用文件 `test/createServer`

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

7. 执行的最终状态如下
fn1(async (ctx, fn2) => {
  console.log(1)
  fn2(async (ctx, fn3) => {
      console.log(2)
      fn3(ctx) => {
        console.lo(3)
      }
      console.log(4)
  })
  console.log(5)
})
// 12345
```
