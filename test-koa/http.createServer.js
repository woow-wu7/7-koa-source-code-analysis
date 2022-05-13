/* eslint-disable */

const http = require("http");

// 创建本地服务器来从其接收数据
const server = http.createServer();

// 1
// 监听请求事件
// - server.on()
server.on("request", (req, res) => {

  res.writeHead(206, { "Content-Type": "application/json" });
  // 响应头相关信息
  // - 状态码是 206
  // - Content-Type: application/json

  res.end(
    // 返回的数据
    JSON.stringify({
      data: "Hello World!",
    })
  );
});

// 2
// 启动服务，指定服务端口
// - server.listen()
server.listen(8000);

// 3
// 注意
// 上面的 http.createServer() 是没有传参数的，其实还可以直接传入request函数，像下面这样
// 详见：test-koa/createServer.js
// const server = http.createServer((req, res) => {
//   res.writeHead(200, { 'Content-Type': 'application/json' });
//   res.end(JSON.stringify({
//     data: 'Hello World!'
//   }));
// });
// server.listen(8000);

// 如何测试
// - 命令行输入：node test-koa/test-http.createServer.js
// - 浏览器打开：http://localhost:8000/ 即可看到返回的数据，即 res.end 中的数据
