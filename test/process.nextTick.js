/* eslint-disable */
console.log(1);

process.nextTick((n) => console.log(n), 3);

setTimeout(() => console.log(2));

setImmediate(() => console.log(4));

new Promise((resolve) => {
  console.log(5);
  resolve();
  console.log(7);
}).then((res) => console.log(6));

// 执行顺序 1 5 7 3 6 2 4
