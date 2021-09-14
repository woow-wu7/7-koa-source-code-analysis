/* eslint-disable */
const Koa = require("../lib/application.js");
const app = new Koa();

app.use(async (ctx, next) => {
  console.log("中间件1");
  await next();
});

app.use(async (ctx, next) => {
  console.log("中间件2");
  ctx.body = "返回数据";
});

app.listen(7000, () => {
  console.log("server run 7000");
});
