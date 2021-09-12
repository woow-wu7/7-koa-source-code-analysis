# koa-源码分析


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
