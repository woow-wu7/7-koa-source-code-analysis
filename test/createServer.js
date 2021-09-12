/* eslint-disable */

const http = require("http");

// 创建本地服务器来从其接收数据
const server = http.createServer((req, res) => {
  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(
    JSON.stringify({
      data: "return data",
    })
  );
});

server.listen(8000);
