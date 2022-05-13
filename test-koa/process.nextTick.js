/* eslint-disable */
console.log(1); // 同步任务

setTimeout(() => console.log(2)); // timer阶段执行 - nodejs事件轮询的第 1 个阶段
setTimeout(() => console.log(8), 0); // timer阶段执行 - nodejs事件轮询的第 1 个阶段

// process.nextTick(callback[, …args])
// 参数
// - callback 回调函数
// - args 回调函数的额参数
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


// 1
// ----------
// node事件轮询
// node.js事件轮训机制 - 一共分为6个阶段
// (1) timers 定时器阶段
// - ( 计时 ) 和 ( 执行到点的定时器 )
// (2) pending callbacks 阶段
// - 执行某些系统操作的回调函数，比如 ( tcp错误类型 )
// (3) idle, prepare 阶段
// - 一些准备工作
// (4) poll轮询阶段，是一个轮询队列
// - 1. 如果 ( 轮询队列不为空 )，依次取出执行，直到 ( 轮询队列为空 ) 或者 ( 达到系统最大限制 )
// - 2. 如果 ( 轮询队列为空 )
//      - 1. 如果之前设置过 ( setImmediate ) 函数，则直接进入下一个阶段 ( check阶段 )
//      - 2. 如果之前没有设置过setImmediate函数，则会在当前poll阶段 ( 等待 )
//           - 直到 ( 轮询队列 ) 添加进了新的回调函数，那么就会进入(4)阶段1的判断，继续执行
//           - 或者 ( 定时器 ) 到点了，也会进入下一个阶段 ( check阶段 )
// (5) check 阶段
// - 执行 ( setImmediate ) 回调函数
// (6) close callbacks 阶段
// - 执行 ( close ) 事件回调函数


// 2
// ----------
// --> 注意点：
// - process.nextTick() 会在nodejs事件轮询的 ( 任意阶段，优先执行 )
// - 因为
//    - process.nextTick() 是 ( 微任务 )
//    - 其他的都是宏任务：比如 setImmediate


// 3
// 常见的宏任务和微任务

// 宏任务
// - setTimeout
// - setInterval
// - setImmediate
// - requestAnimationFrame

// 微任务
// promise
// process.nextTick()
// MutationObserver - 监听DOM的变化 - 详见 test-koa/MutationObserver.html