# Animate Plus Annotation

## [Animate Plus](https://github.com/bendc/animateplus) 源码阅读/注释

`animateplus` 是一个专注于性能和创作灵活性、提供稳定60 FPS的迷你 JavaScript 动画库。分析其源码有助于从中学习一些优化制作动画的技巧

### 一些干货

#### 取数组第一个元素
一般会写 
```javascript
const first = (array) => array[0];
```

而 `animateplus` 是这样写的
```javascript
const first = ([item]) => item;
```

#### 使用 `reduce` 为元素设置属性

```javascript
Object.entries(attributes).reduce((node, [attribute, value]) => {
    node.setAttribute(attribute, value);
    return node; // 返回 node 供下一次遍历使用
  }, document.createElementNS("http://www.w3.org/2000/svg", element));
```

#### style.willChange

`animateplus` 使用了 [will-change](https://developer.mozilla.org/en-US/docs/Web/CSS/will-change) 这个 CSS 属性开启硬件加速

> CSS 属性 `will-change` 为web开发者提供了一种告知浏览器该元素会有哪些变化的方法，这样浏览器可以在元素属性真正发生变化之前提前做好对应的优化准备工作。 这种优化可以将一部分复杂的计算工作提前准备好，使页面的反应更为快速灵敏。

#### performance.now()

`performance.now()` 是 `requestAnimationFrame` 回调函数的默认传参，返回一个时间戳,以毫秒为单位,精确到千分之一毫秒.

和 `Date.now` 不同的是，`performance.now()` 返回的时间戳没有被限制在一毫秒的精确度内，而它使用了一个浮点数来达到微秒级别的精确度

`performance.now()` 是以一个恒定的速率慢慢增加的,它不会受到系统时间的影响(可能被其他软件调整)。另外，

performance.timing.navigationStart + performance.now() ~= Date.now()

#### `**` 求幂

```javascript
console.log(10 ** 1); // 10
console.log(10 ** 2); // 100
console.log(10 ** 3); // 1000
```

#### 缓动函数计算

这是一个大头，以后单独研究
