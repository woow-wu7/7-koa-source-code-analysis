/* eslint-disable */

const Koa = require("../lib/application");
const app = new Koa();

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
  ctx.body = "测试中间执行顺序"; // 返回给前端的值
  // next()
});

app.listen(1000, () => "app run 1000");

// 执行顺序 1 3 5 4 2

// 如果报错：node:internal/modules/cjs/loader:936 throw err
// 解决：请先 npm install 一下
