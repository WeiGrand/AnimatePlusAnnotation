/*
 * Animate Plus v2.1.1
 * Copyright (c) 2017-2018 Benjamin De Cock
 * http://animateplus.com/license
 */


// logic
// =====

/**
 * 获取数组第一个，比较新颖的方法
 * @param item
 * @returns {*}
 */
const first = ([item]) => item;

const computeValue = (value, index) =>
  typeof value == "function" ? value(index) : value;


// dom
// ===
/**
 * 获取 DOM
 * @param elements 可能是以下取值 String | Element | NodeList | Array | NULL
 * @returns {*} DOM 数组
 */
const getElements = elements => {
  if (Array.isArray(elements)) // 处理 Array
    return elements;
  if (!elements || elements.nodeType) // 处理 Element | NULL
    return [elements];
  return Array.from(typeof elements == "string" ? document.querySelectorAll(elements) : elements); // 处理 String | NodeList
};

/**
 * 通过 style.willChange 属性开启硬件加速
 * 默认值为 'auto'
 * 多个值设置语法： style.willChange = 'transform, opacity'
 * @param style
 * @param keyframes
 * @returns {string}
 */
const accelerate = ({style}, keyframes) =>
  style.willChange = keyframes
    ? keyframes.map(({property}) => property).join()
    : "auto";

const createSVG = (element, attributes) =>
  Object.entries(attributes).reduce((node, [attribute, value]) => {
    node.setAttribute(attribute, value);
    return node;
  }, document.createElementNS("http://www.w3.org/2000/svg", element));


// motion blur
// ===========
/**
 * 使用 feGaussianBlur 元素 实现模糊特效
 * @type {{axes: string[], count: number, add({element: *, blur: *}): *}}
 */
const blurs = {
  axes: ["x", "y"],
  count: 0,
  add({element, blur}) {
    const id = `motion-blur-${this.count++}`;
    const svg = createSVG("svg", {
      style: "position: absolute; width: 0; height: 0"
    });
    const filter = createSVG("filter", this.axes.reduce((attributes, axis) => {
      const offset = blur[axis] * 2;
      attributes[axis] = `-${offset}%`;
      attributes[axis == "x" ? "width" : "height"] = `${100 + offset * 2}%`;
      return attributes;
    },{
      id,
      "color-interpolation-filters": "sRGB"
    }));
    const gaussian = createSVG("feGaussianBlur", {
      in: "SourceGraphic"
    });
    filter.append(gaussian);
    svg.append(filter);
    element.style.filter = `url("#${id}")`; // 设置一个SVG滤镜
    document.body.prepend(svg);
    return gaussian;
  }
};

const getDeviation = (blur, {easing}, curve) => {
  const progress = blur * curve;
  const out = blur - progress;
  const deviation = (() => {
    if (easing == "linear")
      return blur;
    if (easing.startsWith("in-out"))
      return (curve < .5 ? progress : out) * 2;
    if (easing.startsWith("in"))
      return progress;
    return out;
  })();
  return Math.max(0, deviation);
};

const setDeviation = ({blur, gaussian, easing}, curve) => {
  const values = blurs.axes.map(axis => getDeviation(blur[axis], easing, curve));
  gaussian.setAttribute("stdDeviation", values.join());
};

/**
 * 主要是为 blurs 的 x 和 y 设置默认值
 * @param blur
 * @returns {*}
 */
const normalizeBlur = blur => {
  const defaults = blurs.axes.reduce((object, axis) => {
    object[axis] = 0;
    return object;
  }, {});


  return Object.assign(defaults, blur);
};

/**
 * 清除模糊
 * @param style
 * @param svg
 */
const clearBlur = ({style}, {parentNode: {parentNode: svg}}) => {
  style.filter = "none";
  svg.remove();
};


// color conversion
// ================

/**
 * 16进制字符拆分为数组
 * @param color
 * @returns {any}
 */
const hexPairs = color => {
  const split = color.split("");
  const pairs = color.length < 5
    ? split.map(string => string + string)
    : split.reduce((array, string, index) => {
      if (index % 2) // 2个一组插入数组
        array.push(split[index - 1] + string);
      return array;
    }, []);
  if (pairs.length < 4)
    pairs.push("ff"); // 默认透明度
  return pairs;
};

/**
 * 16进制 转为 10进制
 * @param color
 * @returns {*}
 */
const convert = color =>
  hexPairs(color).map(string => parseInt(string, 16));

/**
 * 16进制换算为 rgba
 * @param hex
 * @returns {string}
 */
const rgba = hex => {
  const color = hex.slice(1);
  const [r, g, b, a] = convert(color);
  return `rgba(${r}, ${g}, ${b}, ${a / 255})`;
};


// easing equations
// ================

const pi2 = Math.PI * 2;

const getOffset = (strength, period) =>
  period / pi2 * Math.asin(1 / strength);

/**
 * 缓动函数
 */
const easings = {
  "linear": progress => progress,

  "in-cubic": progress => progress ** 3,
  "in-quartic": progress => progress ** 4,
  "in-quintic": progress => progress ** 5,
  "in-exponential": progress => 1024 ** (progress - 1),
  "in-circular": progress => 1 - Math.sqrt(1 - progress ** 2),
  "in-elastic": (progress, amplitude, period) => {
    const strength = Math.max(amplitude, 1);
    const offset = getOffset(strength, period);
    return -(strength * 2 ** (10 * (progress -= 1)) * Math.sin((progress - offset) * pi2 / period));
  },

  "out-cubic": progress => --progress ** 3 + 1,
  "out-quartic": progress => 1 - --progress ** 4,
  "out-quintic": progress => --progress ** 5 + 1,
  "out-exponential": progress => 1 - 2 ** (-10 * progress),
  "out-circular": progress => Math.sqrt(1 - --progress ** 2),
  "out-elastic": (progress, amplitude, period) => {
    const strength = Math.max(amplitude, 1);
    const offset = getOffset(strength, period);
    return strength * 2 ** (-10 * progress) * Math.sin((progress - offset) * pi2 / period) + 1;
  },

  "in-out-cubic": progress =>
    (progress *= 2) < 1
      ? .5 * progress ** 3
      : .5 * ((progress -= 2) * progress ** 2 + 2),
  "in-out-quartic": progress =>
    (progress *= 2) < 1
      ? .5 * progress ** 4
      : -.5 * ((progress -= 2) * progress ** 3 - 2),
  "in-out-quintic": progress =>
    (progress *= 2) < 1
      ? .5 * progress ** 5
      : .5 * ((progress -= 2) * progress ** 4 + 2),
  "in-out-exponential": progress =>
    (progress *= 2) < 1
      ? .5 * 1024 ** (progress - 1)
      : .5 * (-(2 ** (-10 * (progress - 1))) + 2),
  "in-out-circular": progress =>
    (progress *= 2) < 1
      ? -.5 * (Math.sqrt(1 - progress ** 2) - 1)
      : .5 * (Math.sqrt(1 - (progress -= 2) * progress) + 1),
  "in-out-elastic": (progress, amplitude, period) => {
    const strength = Math.max(amplitude, 1);
    const offset = getOffset(strength, period);
    return (progress *= 2) < 1
      ? -.5 * (strength * 2 ** (10 * (progress -= 1)) * Math.sin((progress - offset) * pi2 / period))
      : strength * 2 ** (-10 * (progress -= 1)) * Math.sin((progress - offset) * pi2 / period) * .5 + 1;
  }
};

/**
 * 解构 easing 属性
 * @param string 默认为 "out-elastic" 根据代码 其值还可以是类似 'out-elastic 1 .4' 这种格式
 * @returns {{easing: string, amplitude: number, period: number}}
 */
const decomposeEasing = string => {
  const [easing, amplitude = 1, period = .4] = string.trim().split(" ");
  return {easing, amplitude, period};
};

const ease = ({easing, amplitude, period}, progress) =>
  easings[easing](progress, amplitude, period);


// keyframes composition
// =====================

const extractRegExp = /-?\d*\.?\d+/g;

/**
 * 根据数字拆分字符串 'scale(0)' => ['scale(', ')']
 * @param value
 * @returns {*|string[]}
 */
const extractStrings = value =>
  value.split(extractRegExp);

/**
 * 从字符串中匹配出数字 'scale(0)' => ['0'] => [0]
 * @param value
 * @returns Number[]
 */
const extractNumbers = value =>
  value.match(extractRegExp).map(Number);

/**
 * 这个方法主要是为了处理 16进制颜色 转为 rgba 语法
 * @param values
 * @returns {*}
 */
const sanitize = values =>
  values.map(value => {
    const string = String(value);
    return string.startsWith("#") ? rgba(string) : string;
  });

/**
 *
 * @param property
 * @param values
 * @returns {{property: *, strings: *, numbers: *, round: boolean}}
 */
const addPropertyKeyframes = (property, values) => { // 以 'transform', ['scale(0)', 'scale(1)'] 为例
  const animatable = sanitize(values); // => ['scale(0)', 'scale(1)']
  const strings = extractStrings(first(animatable)); // => ['scale(', ')']
  const numbers = animatable.map(extractNumbers); // => [[0], [1]]
  const round = first(strings).startsWith("rgb"); // => 是否是设置 rgb 属性 => false
  // {
  // property: 'transform',
  // strings: ['scale(', ')'],
  // numbers: ['0'],
  // round: false
  // }
  return {property, strings, numbers, round};
};

/**
 *
 * @param keyframes
 * @param index
 * @returns {{property, strings, numbers, round}[]}
 */
const createAnimationKeyframes = (keyframes, index) =>
    // Object.entries 返回对象的键值对数组 https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/entries

  Object.entries(keyframes).map(([property, values]) =>
    addPropertyKeyframes(property, computeValue(values, index))); // property values

const getCurrentValue = (from, to, easing) =>
  from + (to - from) * easing;

// from = [80], to = [0], strings = (2) ["translate(", "%)"], round = false, easing = 0
// => "translate(0%)"
const recomposeValue = ([from, to], strings, round, easing) =>
  strings.reduce((style, string, index) => {
    const previous = index - 1;
    const value = getCurrentValue(from[previous], to[previous], easing);
    return style + (round && index < 4 ? Math.round(value) : value) + string; // rgb 需要取整（Math.round），a 不用
  });

const createStyles = (keyframes, easing) =>
  keyframes.reduce((styles, {property, numbers, strings, round}) => {
    styles[property] = recomposeValue(numbers, strings, round, easing);
    return styles;
  }, {});

/**
 * 倒转动画方向，如将 ['scale(0)', 'scale(1)'] => ['scale(1)', 'scale(0)']
 * 代码只需将 keyframes 中的 `numbers` 数组调转即可
 * @param keyframes
 * @returns {*}
 */
const reverseKeyframes = keyframes =>
  keyframes.forEach(({numbers}) => numbers.reverse());


// animation tracking
// ==================

const rAF = {
  all: new Set,
  add(object) {
    if (this.all.add(object).size < 2) requestAnimationFrame(tick);
  }
};

const paused = {};

/**
 * 追踪开始运动了多久
 * @param timing
 * @param now
 */
const trackTime = (timing, now) => { // requestAnimationFrame 的执行周期内，now 是不断增大的
  if (!timing.startTime) timing.startTime = now; // startTime 为赋值或为 0 的情况
  timing.elapsed = now - timing.startTime; // elapsed 代表 开始运动了多久
};

const resetTime = object =>
  object.startTime = 0;

/**
 * 获取运动进行的百分比
 * @param elapsed 开始运动了多久
 * @param duration 运动总时长
 * @returns {number} 0 到 1（1 代表 运动完成）
 */
const getProgress = ({elapsed, duration}) =>
  duration > 0 ? Math.min(elapsed / duration, 1) : 1;

const setSpeed = (speed, value, index) =>
  speed > 0 ? computeValue(value, index) / speed : 0;

/**
 * 入口函数
 * @param options
 * @param resolve
 */
const addAnimations = (options, resolve) => {
  // 配置项
  const {
    elements = null, // 解构赋值设置默认值
    easing = "out-elastic", // 动画效果
    duration = 1000, // 动画持续时间, 受 speed 的影响
    delay: timeout = 0, // 延迟时间
    speed = 1, // 速度，影响最终的 duration
    loop = false, // 循环
    optimize = false, // 是否启用硬件加速（通过 css 的 will-change 属性），作者不推荐启用，说这样会带来 `side-effects`
                      //CSS 属性 will-change 为web开发者提供了一种告知浏览器该元素会有哪些变化的方法，这样浏览器可以在元素属性真正发生变化之前提前做好对应的优化准备工作。 这种优化可以将一部分复杂的计算工作提前准备好，使页面的反应更为快速灵敏。
                      // https://developer.mozilla.org/zh-CN/docs/Web/CSS/will-change
    direction = "normal", // 方向 还可取 reverse，alternate
    blur = null, // 模拟运动过程中的模糊效果，取值格式 {x: 20, y: 2}
    change = null,
    ...rest // 剩下的参数都是和 html 动画 或 SVG 相关的属性 如 `r`、`fill`、`transform` 等
  } = options;

  const last = {
    totalDuration: -1
  };

  getElements(elements).forEach(async (element, index) => {
    const keyframes = createAnimationKeyframes(rest, index);
    const animation = {
      element,
      keyframes,
      loop,
      optimize,
      direction,
      change,
      easing: decomposeEasing(easing),
      duration: setSpeed(speed, duration, index)
    };

    const animationTimeout = setSpeed(speed, timeout, index);
    const totalDuration = animationTimeout + animation.duration;

    // 运动方向处理
    if (direction != "normal")
      reverseKeyframes(keyframes); // 先统一转为反方向，但是当值为 'alternate' 时，开始运动的方向不应该为反方向的，这个在 `tick` 方法中有处理

    if (element) {
      // 硬件加速处理
      if (optimize)
        accelerate(element, keyframes);


      if (blur) {
        animation.blur = normalizeBlur(computeValue(blur, index));
        animation.gaussian = blurs.add(animation);
      }
    }

    if (totalDuration > last.totalDuration) {
      last.animation = animation;
      last.totalDuration = totalDuration;
    }

    if (animationTimeout) await delay(animationTimeout);
    rAF.add(animation);
  });

  const {animation} = last;
  if (!animation) return;
  animation.end = resolve;
  animation.options = options;
};

const tick = now => { // requestAnimationFrame 的 callback 接受一个参数 performance.now()
  const {all} = rAF; // animation Set
  all.forEach(object => {
    trackTime(object, now);
    const progress = getProgress(object);
    const {
      element,
      keyframes,
      loop,
      optimize,
      direction,
      change,
      easing, // {easing: string, amplitude: number, period: number}
      duration,
      gaussian,
      end,
      options
    } = object;

    // object is an animation
    // 通过有没有 direction 判断 object 是动画还是延迟
    if (direction) {
      let curve = progress;
      switch (progress) {
        case 0: // 运动起点
          if (direction == "alternate") reverseKeyframes(keyframes); // 转为正反方向
          break;
        case 1: // 运动终点
          if (loop)
            resetTime(object); // 循环运动将 startTime 重置为 0
          else {
            all.delete(object); // 将该运动从 Set 中移除
            if (optimize && element) accelerate(element); // 将 CSS 的 will-change 改回 'auto'
            if (gaussian) clearBlur(element, gaussian);
          }
          if (end) end(options);
          break;
        default:
          curve = ease(easing, progress);
      }
      if (gaussian) setDeviation(object, curve);
      if (change && end) change(curve); // 提供 progress 给 change 方法，可以实现进度条等效果
      if (element) Object.assign(element.style, createStyles(keyframes, curve)); // 设置元素的 style 开始CSS动画
      return;
    }

    // object is a delay
    if (progress < 1) return;
    all.delete(object);
    end(duration);
  });

  if (all.size) requestAnimationFrame(tick);
};

// 处理标签页的隐藏或显示
document.addEventListener("visibilitychange", () => {
  const now = performance.now();

  // 标签页隐藏时，缓存当前的动画，然后停止所有的动画
  if (document.hidden) {
    const {all} = rAF;
    paused.time = now; // 保存停止的时刻
    paused.all = new Set(all);
    all.clear(); // 清除掉所有的动画
    return;
  }

  // 标签页显示时，恢复之前的当前的动画
  const {all, time} = paused;
  if (!all) return;
  const elapsed = now - time; // 恢复动画进度
  requestAnimationFrame(() =>
    all.forEach(object => {
      object.startTime += elapsed;
      rAF.add(object);
    }));
});


// exports
// =======

export default options =>
  new Promise(resolve => addAnimations(options, resolve));

export const delay = duration =>
  new Promise(resolve => rAF.add({
    duration,
    end: resolve
  }));

/**
 * 停止某个动画只需将其从 Set 中移除即可
 * @param elements
 * @returns {*}
 */
export const stop = elements => {
  const {all} = rAF;
  const nodes = getElements(elements);
  all.forEach(object => {
    if (nodes.includes(object.element)) all.delete(object);
  });
  return nodes;
};
