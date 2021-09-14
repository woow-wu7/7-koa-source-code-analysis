/* eslint-disable */
const Koa = require('./lib/application.js');
const app = new Koa();

// logger
app.use(async (ctx, next) => {
  console.log(`ctx`, ctx)
  await next();
  const rt = ctx.response.get('X-Response-Time'); // --- 读：获取 ctx 对象上的的 'X-Response-Time' 属性
  console.log(`${ctx.method} ${ctx.url} - ${rt}`); // -- 打印 method url 'X-Response-Time'
});

// x-response-time
app.use(async (ctx, next) => {
  const start = Date.now();
  await next();
  const ms = Date.now() - start;
  ctx.set('X-Response-Time', `${ms}ms`); // --------------- 写：在 ctx 对象上设置 'X-Response-Time' 属性
});

// response
app.use(async ctx => {
  ctx.body = 'Hello World';
});

app.listen(2000, () => console.log('server run 2000'));
